# PromDevs

A pnpm workspace with independently deployable public website, studio admin, and API.
The public design, routes, and experimental assets are preserved. The API owns the canonical portfolio database schema.

## Workspace

| Package               | Location             | Purpose                                                        |
| --------------------- | -------------------- | -------------------------------------------------------------- |
| `@promdevs/web`       | `apps/web`           | Next.js App Router website; server-rendered project pages      |
| `@promdevs/admin`     | `apps/admin`         | React + Vite project-management dashboard                      |
| `@promdevs/api`       | `apps/api`           | Node.js/TypeScript API; Neon, Resend, and admin authentication |
| `@promdevs/contracts` | `packages/contracts` | Shared Zod schemas, API payloads, and TypeScript types         |
| `@promdevs/ui`        | `packages/ui`        | Browser-safe shared wordmark and button primitives             |

Use Node.js 24 (`.nvmrc`) and **pnpm 10.32.1**, pinned in `packageManager`.
Existing direct dependency versions were retained from the npm lockfile. New admin
build tooling was added separately. Use only `pnpm-lock.yaml`; do not mix lockfiles.
No Turborepo, external auth subscription, or paid deployment service is required.

## Local Setup

```sh
npm install --global pnpm@10.32.1
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm dev
```

The one npm command bootstraps pnpm; it does not install application dependencies.
If your old Next.js process is still running, stop it before starting the workspace.

| Application | Local URL                    |
| ----------- | ---------------------------- |
| Website     | http://localhost:3000        |
| Admin       | http://localhost:5173        |
| API health  | http://127.0.0.1:4000/health |

`pnpm dev` builds contracts, then starts all three apps. The API reads its local
`.env.local`, then `.env`; the old root `.env` is a development-only fallback.
Existing shell variables take precedence. The website does **not** load the root
credentials. Production gets secrets from Coolify, not committed environment files.
After changing contracts, restart `pnpm dev` to rebuild the shared package.

### Environment Variables

**API only** (`apps/api/.env` locally; Coolify API runtime variables in production):

- `DATABASE_URL`: existing Neon PostgreSQL connection string; required for projects and database-backed admin authentication.
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL`: required for real email delivery.
- `CONTACT_FROM_EMAIL`: defaults to `onboarding@resend.dev`; verify your own sender domain for production.
- `CONTACT_FROM_NAME`, `CONTACT_TO_NAME`: optional email display names.
- `ADMIN_ORIGIN`: exact admin origin, e.g. `http://localhost:5173` locally or `https://admin.promdevs.com` in production. No trailing slash or wildcard.
- `PORT`, `HOST`: default `4000` / `127.0.0.1`; the API Dockerfile sets `HOST=0.0.0.0`.
- `NODE_ENV=production`: enables secure session cookies and disables local dotenv fallbacks.
- `TRUST_PROXY`: false by default. Enable only when every path to the API is behind a trusted ingress that sanitizes `X-Forwarded-For`; prevent direct origin access. Otherwise use socket IPs. A shared proxy IP means requests share a rate-limit bucket.
- `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: optional Cloudflare R2 configuration, required together when storage is used. API runtime only.
- `R2_PUBLIC_BASE_URL`: optional HTTPS media origin; set only after intentionally configuring public bucket delivery. See [storage setup](docs/storage.md).

**Website only** (`apps/web/.env.local` or Coolify web runtime variables):

- `API_BASE_URL`: server-side API origin, default `http://127.0.0.1:4000`. Set an internal Coolify service URL or the HTTPS API domain in production. No database or email credentials belong in the web app.

**Admin:**

- `API_PROXY_TARGET`: local Vite development/preview proxy target, default `http://127.0.0.1:4000`.
- `API_UPSTREAM`: production Nginx proxy target, set on the admin container. No trailing slash; e.g. `http://<api-service-name>:4000` or `https://api.promdevs.com`.

Never place credentials in `VITE_*` or `NEXT_PUBLIC_*` variables.

### Enable Your Administrator

Admin login uses `admin_users` and persistent `admin_sessions`. The API enforces
Owner/Admin/Editor permissions; see [admin access control](docs/admin-access-control.md).
There is no environment-login fallback, public registration, or default password.
`ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are no longer read: remove them from local
environment files and Coolify **after deploying this API version**.

After applying the admin schema, bootstrap the first owner in your own terminal:

```sh
pnpm admin:seed-owner --check  # read-only readiness check
pnpm admin:seed-owner --apply  # hidden password prompts; explicit write confirmation
pnpm admin:check              # read-only schema and active-owner verification
```

The seed refuses any existing accounts/prior bootstrap, never promotes or
overwrites a user, and inserts an owner plus audit event in one transaction.
If already seeded, do not seed again; use `admin:check` and sign in with the seeded
owner credentials. Never paste the owner password into chat, command arguments,
environment variables, or Git.

The admin manages real projects: list/search, create, edit, feature, and delete,
including case-study copy, links, technologies, and tags. New records are drafts.
Public reads require `publication_status = published`; the existing `status`
still describes work progress. The unchanged editor cannot publish or manage
new schema fields/title-only drafts yet. Uploads, expanded draft workflows,
account-management UI, invitations, password reset, MFA, and client-story management
are not implemented yet. Editors can create/edit drafts, but cannot edit published
or archived projects or delete projects. Owners and admins can edit/delete projects.
The public website retains its existing empty portfolio state when no projects exist.

Authentication uses salted scrypt, random opaque sessions, HttpOnly/SameSite=Strict
cookies, origin checks on writes, login throttling, and server-side authorization
for every admin route. The admin proxies `/api` through its own origin, so browser
cookies are not shared across domains and no permissive CORS policy is needed.
Use HTTPS in production. You can add Cloudflare Access as another protective layer.

Sessions last eight hours and store only SHA-256 token digests in PostgreSQL.
Current role, status, and credential version are checked on every authenticated
request. API restarts no longer sign users out. Legacy in-memory cookies will
require a fresh login after this cutover. Login, logout, and project deletions
write atomic audit events without credentials or tokens.
Run **one API replica** while rate limits are still in memory; a shared rate-limit
store is required before scaling. Expired-session cleanup is not automated yet.

## Commands

```sh
pnpm dev                # all three apps
pnpm dev:web            # website only (API needed for projects/contact)
pnpm dev:admin          # admin only (API needed for login/content)
pnpm dev:api            # API only
pnpm lint
pnpm typecheck
pnpm test               # isolated fixtures; no database writes or emails
pnpm build              # build all packages in dependency order
pnpm build:web          # web and its shared dependencies
pnpm build:admin
pnpm build:api
pnpm start              # built web app
pnpm --filter @promdevs/api start
pnpm --filter @promdevs/admin preview
pnpm db:status         # read-only migration-history check; requires DATABASE_URL
pnpm db:generate --name=portfolio_schema  # offline SQL generation
pnpm db:migrate        # preflight, then apply reviewed SQL; requires DATABASE_URL
pnpm skills:import /absolute/path/skills.csv --dry-run # validate and check conflicts
pnpm storage:check      # read-only R2 bucket access check; requires R2 configuration
pnpm admin:seed-owner --check # read-only first-owner readiness check
pnpm admin:check        # read-only schema/active-owner check (no credential output)
```

The web build uses Webpack because the local Turbopack sandbox previously failed.
The website and admin can build without a running API or database credentials.
The root verification workflow runs frozen installs, lint, types, tests, and builds.

The canonical schema is `apps/api/src/db/schema.ts`; no separate portfolio schema
or config is needed. Historical migrations in `apps/api/drizzle` are preserved.
Follow [the migration guide](docs/database-migrations.md) before applying changes:
the old history contains duplicate table creation. `db:migrate` stops on unsafe
history replay. No seed data, live migrations, or automatic startup migrations
are performed. Migrate before deploying this API version.

## API

Cloudflare R2 storage helpers are available in the API only. No upload routes or UI
are exposed yet, and no bucket or live objects are created automatically. Follow
[the storage guide](docs/storage.md) to configure credentials and Coolify. The
initial helper supports JPEG/PNG/WebP images up to 10 MiB; other media comes later.

Skills imports are explicit API-only operations, not startup seeds. The supplied
24-row catalog has been imported with original IDs/timestamps. See
[the repeat-safe import guide](docs/skills-import.md) before importing elsewhere.

| Method / endpoint                | Behavior                                                   |
| -------------------------------- | ---------------------------------------------------------- |
| `GET /health`                    | Process liveness; does not assert database/email readiness |
| `GET /api/projects`              | Public project catalog                                     |
| `GET /api/projects/:slug`        | Public project detail; 404 if absent                       |
| `POST /api/contact`              | Validated email; honeypot; max 5 requests/IP/10 minutes    |
| `POST /api/admin/login`          | Configured administrator login                             |
| `GET /api/admin/session`         | Authenticated session identity                             |
| `POST /api/admin/logout`         | Revoke session and clear cookie                            |
| `GET /api/admin/projects`        | Authenticated catalog                                      |
| `POST /api/admin/projects`       | Authenticated create                                       |
| `PUT /api/admin/projects/:id`    | Authenticated full update                                  |
| `DELETE /api/admin/projects/:id` | Authenticated delete                                       |

The website's `/api/contact` remains a same-origin, bounded-body proxy, preserving
its existing form interface. The API owns final validation, rate limiting, honeypot
checking, and email delivery. Payload: `{ name, email, subject, message, company }`.
If Resend is unconfigured, the existing explicit TODO server-log fallback remains.
Logs can contain contact PII; protect log access and retention. Provider/database
errors are never returned verbatim. API body size is limited to 64 KiB.

Project pages fetch server-side without caching so admin changes are visible on the
next request. Missing projects return 404; service outages on detail pages produce
an error rather than a false 404. The homepage remains statically rendered. A public
content cache with invalidation can be added later without changing the API contract.

## Separate Coolify Deployments

Follow [the step-by-step Coolify guide](deploy/COOLIFY.md) for independent triggers,
copyable watch paths, per-app variables, DNS, and first-deployment checks.

Connect this repository three times as separate **Dockerfile** applications. Use
the repository root as the build context; workspace packages must be available.

| App   | Dockerfile                | Container port | Suggested domain                    |
| ----- | ------------------------- | -------------- | ----------------------------------- |
| Web   | `deploy/web.Dockerfile`   | 3000           | `promdevs.com` / `www.promdevs.com` |
| Admin | `deploy/admin.Dockerfile` | 80             | `admin.promdevs.com`                |
| API   | `deploy/api.Dockerfile`   | 4000           | `api.promdevs.com`                  |

Configure API secrets only on the API. Deploy it first; set the web `API_BASE_URL`
and admin `API_UPSTREAM` to reachable addresses. The default admin upstream `api`
is only an example service hostname, not a guaranteed Coolify-generated name.
If using the public HTTPS API, Nginx verifies its TLS certificate. If using internal
HTTP, keep it on a private container network. No environment secrets are build args.

Suggested Coolify watch paths:

- Web: `apps/web/**`, `packages/contracts/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `deploy/web.Dockerfile`.
- Admin: `apps/admin/**`, `packages/contracts/**`, `packages/ui/**`, shared root config/lockfiles, `deploy/admin*`.
- API: `apps/api/**`, `packages/contracts/**`, shared root config/lockfiles, `deploy/api.Dockerfile`.

Proxy public domains through Cloudflare and use Full (strict) TLS with valid origin
certificates. Do not cache admin HTML, authentication endpoints, mutations, or private
API responses. Public API responses currently use `no-store` too. Allow legitimate
search crawlers on the website. Protect the origin, maintain off-server database
backups, and monitor uptime. Three containers on one VPS are not high availability.
No production deployment is performed by this repository setup.

The admin has noindex metadata, a disallow-all robots file, and Nginx security headers.
These are indexing controls, **not** substitutes for backend authentication.

## Public Design And Social Previews

The website retains monochrome stippling, self-hosted DM Sans/Space Grotesk,
light/dark theme persistence, responsive navigation, and reduced-motion support.
Experimental Apollo/ribbon assets stay unused in `apps/web/public` and components;
Spline provenance and source experiments remain in `design/`.

Open Graph and Twitter use the existing 1200 x 630 PNGs and descriptive alt files in
`apps/web/app`. Prepare the editable composition with:

```sh
pnpm social:prepare
```

Render `output/social/preview.html` in Chromium at 1200 x 630, device scale factor 1,
after fonts load; export the PNG to `apps/web/app/opengraph-image.png` and
`apps/web/app/twitter-image.png`. All assets are local. Georgia supplies the italic
serif on the design machine; the static exported images need no fonts in production.
The existing public GA4 measurement ID is intentionally not a private credential.

## Secret Protection

All local environment files, private keys, database backups, build outputs, and
verification artifacts are ignored. `.dockerignore` also excludes secrets and
recovery exports from build contexts. Examples contain only blank credentials.
The website has no database/email dependencies and its API client uses `server-only`.

The pinned, checksum-verified Gitleaks workflow scans Git history on pushes and pull
requests with redacted output. Scan locally with:

```sh
gitleaks git --log-opts="--all" --redact=100 --no-banner .
pnpm audit --prod
```

If a credential is ever committed, revoke/rotate it before coordinating any history
cleanup. Never assume deleting the file makes the old value safe. Do not commit
secret-bearing scan reports. Known development-tooling advisories should be reviewed
without blindly applying breaking `audit fix --force` downgrades.
