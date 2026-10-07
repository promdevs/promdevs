# Admin Accounts and Roles

## Status and scope

Database authentication and authorization are active in the API source. Deploy
the updated API to enable them in production; no admin or website UI changes are
required. Login now reads `admin_users`, and sessions persist in `admin_sessions`.
There is no `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` fallback. The user applied the
schema migration and ran the owner bootstrap; the agent does not seed or mutate
live accounts during verification.

Existing project routes enforce current database roles. The admin now includes
owner-only **Users** management, a **Security** screen for every signed-in user,
and a separate invitation acceptance screen. Deploy the API first, then the admin;
no schema changes or migration are needed for this step.
The role matrix describes the overall policy, not a claim that every listed feature
is exposed. Publishing and audit viewing are not implemented. The new
[project editor](project-management.md) allows draft edits/uploads for all three
roles and archive/restore for owners/admins; published records are read-only there.
Legacy project endpoints retain their prior permissions.

## Roles

Use three fixed roles, not editable roles or a permissions-management UI:

| Capability                                   | Owner | Admin | Editor |
| -------------------------------------------- | ----- | ----- | ------ |
| Read studio content                          | Yes   | Yes   | Yes    |
| Create content and edit drafts               | Yes   | Yes   | Yes    |
| Upload media                                 | Yes   | Yes   | Yes    |
| Edit already-published content               | Yes   | Yes   | No     |
| Publish/unpublish and archive content        | Yes   | Yes   | No     |
| Delete content or media                      | Yes   | Yes   | No     |
| View/manage administrator accounts and roles | Yes   | No    | No     |
| Read security audit history                  | Yes   | No    | No     |

The API-only policy is `apps/api/src/access-control/roles.ts`. Unknown roles,
permissions, and inactive accounts are denied. `editor` is the database default;
there is no default owner or implicit superuser. One role per account is enough
for v1, so no `roles`, `permissions`, or `user_roles` tables are needed. Add or
change fixed roles through reviewed code and schema changes, not arbitrary input.

Editing a published record changes the live website even without pressing Publish.
The separate `content.edit_published` permission prevents that bypass. Future
resource checks must also cover indirect changes: for example, editing client
identity or shared assets used by published projects/reviews affects live content.
Creating content must force draft status for editors regardless of submitted data.
Field-level validation, referenced-resource access, and workflow transitions still
belong in the API; a permission boolean alone is not sufficient.

## Tables

The canonical Drizzle entry point remains `apps/api/src/db/schema.ts`, which
re-exports the isolated definitions in `apps/api/src/db/admin-schema.ts`.

### `admin_users`

| Column                     | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                       | Generated UUID; unrelated to client/contributor IDs.                                                    |
| `email`                    | Unique, normalized lowercase and trimmed email. API must perform full email validation too.             |
| `name`                     | Nonblank account display name, at most 120 trimmed characters.                                          |
| `password_hash`            | Nullable until activation; accepts the existing salted scrypt encoding, never a plaintext password.     |
| `role`                     | `owner`, `admin`, or `editor`; defaults to `editor`.                                                    |
| `status`                   | `invited`, `active`, or `disabled`; defaults to `invited`.                                              |
| `auth_version`             | Positive credential/session version, initially 1.                                                       |
| `email_verified_at`        | Optional timestamp of an actual verification event; never inferred simply because an email was entered. |
| `password_changed_at`      | Required for an active account alongside its password hash.                                             |
| `last_login_at`            | Optional successful-login timestamp.                                                                    |
| `created_at`, `updated_at` | UTC-aware audit timestamps.                                                                             |

Invited accounts have no password hash or password-change timestamp. Active
accounts require both. Disabled accounts may retain their hash for deliberate
reactivation; retaining a hash must never permit login while disabled. Prefer
deactivation to hard deletion so attribution is retained. Email normalization is
application-wide lowercase/trim only; do not merge provider-specific aliases.

### `admin_sessions`

Opaque session persistence: SHA-256 `token_hash` as primary key, `user_id`, the
user's `auth_version` copied at issuance, `created_at`, `expires_at`, optional
`last_seen_at`, and `revoked_at`. No raw bearer token or cached role is stored.
Indexes support per-user revocation and expiry cleanup. Expiry must follow creation.
Deleting an otherwise-unreferenced account cascades its sessions only.

Every authenticated request loads the current user and session and verifies all of:

- The token matches a stored digest; the session is unexpired and unrevoked.
- The account still has `status = active`.
- Session/user `auth_version` values still match.
- The current database role permits the operation on the requested resource.

Role changes, password changes, disable/reactivate operations must increment the
user's version and revoke sessions atomically. This prevents old cookies from
regaining access after reactivation. Check current state on every request; never
trust a role submitted by the browser or stored in a stale session snapshot.
Account-management services implement these checks, increments, revocations and
safe audit events atomically. Direct database edits bypass the service safeguards
and must not be used as a normal management workflow.

Continue using HttpOnly, Secure-in-production, SameSite cookies, bounded lifetime,
login throttling, token rotation on login, and origin checks for mutations. Never
store bearer tokens in browser localStorage. Expired session cleanup is future work.

### `admin_invitations`

UUID `id`, target `user_id`, owner `invited_by`, unique SHA-256 `token_hash`,
`created_at`, `expires_at`, and optional `accepted_at`/`revoked_at`. Both user
references restrict deletion. A unique partial index allows one unresolved invite
per user; expiry is still checked at acceptance. Revoke an old invite, including an
expired one, before issuing a replacement. Accepted and revoked cannot coexist;
acceptance must occur before expiry. Self-invitations are rejected.

The role lives on `admin_users`, not in an invite snapshot. Changing roles or
email while an invite is pending must revoke/reissue the invite, rather than
allowing an old link to silently activate altered access. Email editing is not
exposed by this version. Role/status changes revoke both invitations for that
account and invitations it issued; resend is an explicit separate action.
Acceptance must consume the token and set password/status/verification timestamps
atomically, with a conditional one-time update. These cross-table invariants and
current-owner checks are not enforced by CHECK constraints alone.

No public registration. The owner chooses a name, email and role; the recipient
chooses their own password using a private emailed link. Raw tokens are sent once
by email and never returned in API responses or stored in logs/database rows.
Links use `/#invite=<token>` at the configured `ADMIN_ORIGIN`, not URL queries.
The admin clears the fragment and keeps the token in component memory only.
Acceptance uses a POST JSON body, verifies the current inviter is an active owner,
and activates the account with password/verification timestamps atomically.
There is no automatic login after acceptance; the recipient must sign in.

Invites expire after 72 hours. Resend revokes all unresolved prior links first.
Missing email configuration stops before any account write; provider failure
revokes that newly issued invitation and retains the invited account for recovery.
If revocation itself cannot be confirmed, the API fails closed rather than
claiming successful delivery. A disabled account without credentials can receive
a fresh invitation and return to `invited`; an established disabled account must
be deliberately reactivated instead. No existing password is overwritten by resend.

### `admin_audit_logs`

UUID `id`, optional `actor_id`, dotted `action` such as `user.role_changed`,
optional paired `target_type`/`target_id`, bounded JSON object `metadata` (16 KiB),
and `created_at`. Actor references restrict hard deletion; a NULL actor is reserved
for intentional system/bootstrap events. Target IDs support UUID administrator
IDs and existing integer portfolio IDs without coupling history to deletable rows.

Login/session rotation, logout/session revocation, project deletion, account changes,
password changes, and invitation creation/resend/acceptance already write atomic
audit events. Future publishing services must do the same. Metadata uses an explicit safe allowlist
such as old/new role or publication status. Never copy whole request/user rows,
passwords, password hashes, bearer tokens, signed URLs, or provider credentials.
The intended API interface is append-only; the table is not tamper-proof against
a privileged database operator, and no database-level immutability is claimed.

## Migration and owner bootstrap

Generated offline: `apps/api/drizzle/0004_admin_access_control.sql`, snapshot, and
journal entry. It creates exactly four admin tables with constraints, relations,
and indexes; it does not alter portfolio tables, insert accounts, overwrite
passwords, or drop existing data. Historical migrations are untouched.

After reviewing SQL and taking a backup, apply it yourself with the existing
guarded workflow:

```sh
pnpm db:status
pnpm db:migrate
```

Do not regenerate the migration merely to apply it. The historical migration
limitations still apply; follow [the migration guide](database-migrations.md).
Schema changes alone do not activate database login or role enforcement; deploy
the updated API as well. There is no new migration for this authentication cutover.

**Owner seeding is an explicit separate step.** The command reads API-only
`DATABASE_URL` locally and accepts no credentials
through flags, password environment variables, or piped input:

```sh
pnpm admin:seed-owner --check
pnpm admin:seed-owner --apply
pnpm admin:check
```

No argument defaults to the read-only check. `--apply` requires your own interactive
terminal and prompts for owner email, name, a new password (9-1024 characters),
and matching confirmation. Password entry is hidden, and no password/hash is
printed. Check that your API environment points at the intended database first.
Type `CREATE OWNER` at the final prompt to authorize the write. Ctrl+C, EOF,
invalid input, or a different confirmation prevents the write.

The script requires an empty admin account table and no previous owner-bootstrap
audit event. It never reuses `ADMIN_PASSWORD_HASH`, promotes an existing account,
or overwrites a password. It locks the users/audit tables, checks readiness again
under the lock, inserts one active owner and a system audit event, and verifies
both in one Read Committed transaction. Concurrent bootstrap attempts cannot both
create an owner. Existing portfolio records are not changed. A previous bootstrap
event blocks reuse even if accounts were manually deleted; recovery is deliberate,
not a reason to erase history or disable safeguards.

The seeded account's `email_verified_at` stays NULL: bootstrap is not email
verification. There is no default password or startup seed. Never embed an actual
hash/password in a migration or repository. A failed network response can follow
a successful commit; run `--check` before retrying and inspect authorized database
state rather than assuming nothing was written. The command refuses a blind
second bootstrap. No rollback or cleanup command is provided.

Before deploying the cutover, ensure the first owner is seeded. `pnpm admin:check`
verifies tables and counts active owners with credentials without creating sessions
or printing emails/password hashes. This is different from `admin:seed-owner --check`,
which checks eligibility for a _first_ bootstrap and correctly refuses an already
initialized account table. Once deployed, sign in with the seeded credentials.
Remove obsolete environment credentials from Coolify after deploying this version.
Legacy in-memory sessions will not be recognized, but new sessions survive restarts.
Database authentication failures return a generic 503 and never fall back to an
environment password. The login/session JSON response remains `{ email }` for UI
compatibility; roles are not trusted from the browser.

Editors' UPDATE statements include `publication_status = 'draft'` to prevent
concurrent publishing from bypassing the restriction. Creates always remain drafts.
Owners/admins may edit archived/published records and delete projects. Deletes
record actor identity atomically; a failed audit write rolls back the deletion.

Owner-management transactions prevent demoting/disabling the last active owner
using a `SHARE ROW EXCLUSIVE` lock on `admin_users` and a fresh Read Committed
snapshot after acquiring the lock. The actor's current owner role, active status,
and authentication version are checked again inside the transaction. Competing
owner changes cannot both remove the last owner. These low-volume administrator
writes are serialized; ordinary account reads do not need that lock. Application
writers use the same locking protocol. The safeguard does not protect against
manual changes by a privileged database operator.

No password-recovery flow, MFA, OAuth, configurable permissions, automatic
cleanup, or client-facing account system is included. Admin accounts do not
replace portfolio contributors or link them automatically.

## Account endpoints

All responses are `Cache-Control: no-store`. Every mutation checks the exact
admin origin and is rate-limited. Role/status values are strict, unknown fields
are rejected, and users cannot submit password hashes or authentication versions.

| Endpoint                                    | Access           | Behavior                                                                                                                      |
| ------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/me`                         | Signed in        | Current ID, email and role; existing `/session` response stays unchanged.                                                     |
| `GET /api/admin/users?limit=50&offset=0`    | Owner            | Paginated safe account fields; no hashes, token digests or credentials.                                                       |
| `PATCH /api/admin/users/:id`                | Owner            | Name, role, active/disabled status. Name-only changes preserve sessions; access changes revoke them and relevant invitations. |
| `POST /api/admin/users/:id/sessions/revoke` | Owner            | Increment credential version, revoke all sessions, audit. Revoking your own sessions signs you out.                           |
| `POST /api/admin/users/invitations`         | Owner            | Create invited account and email a private link. No default password.                                                         |
| `POST /api/admin/users/:id/invitation`      | Owner            | Rotate and resend for an unactivated account; never reset an established account's password.                                  |
| `POST /api/admin/invitations/preview`       | Valid invitation | Validate JSON token and show recipient/role; no writes.                                                                       |
| `POST /api/admin/invitations/accept`        | Valid invitation | One-time activation with password and matching confirmation; no session issued.                                               |
| `POST /api/admin/password`                  | Signed in        | Verify current password, require a different matching 9-1024-character password, revoke every session including the caller.   |

The optional `ADMIN_FROM_EMAIL` falls back to `CONTACT_FROM_EMAIL`. A configured
Resend key and verified sender are required for invitations. There is **no** log
fallback for authentication links. UI visibility is convenience, not security:
the API rechecks permissions and current account state independently.

## Verification

Unit tests cover every role/permission pair, inactive/unknown denial, schema
defaults, literal constraints, token digests, invitation uniqueness, and audit
attribution. The generated SQL is also checked against isolated local PostgreSQL
using temporary test accounts only; no live database is connected or mutated.
HTTP tests also cover all three roles, draft versus published/archived edits,
deletion denial, immediate role/status changes, persistent token rotation/logout,
expiry, auth-version invalidation, login races, and fail-closed database outages.
Account tests add owner-only endpoint denial, pagination/input validation,
single-use/expired invitations, resend rotation, email-failure handling, current-
password verification, and session revocation. Isolated PostgreSQL checks verify
the real queries, last-owner serialization, response allowlists, and audit-failure
rollback. Browser checks use temporary fixture accounts and a mock mailer only.

References: [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
[OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html),
and [Drizzle generation](https://orm.drizzle.team/docs/drizzle-kit-generate).
