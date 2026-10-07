import { neon } from "@neondatabase/serverless";
import type { AdminAccount, AdminAccountUpdate } from "@promdevs/contracts";
import type { AuthIdentity, LoginUser } from "./auth-store.js";

export type AccountOutcome =
  "ok" | "forbidden" | "missing" | "last_owner" | "activation";
export interface AccountsStore {
  list(
    actor: AuthIdentity,
    limit: number,
    offset: number,
  ): Promise<{ allowed: boolean; users: AdminAccount[]; total: number }>;
  update(
    actor: AuthIdentity,
    id: string,
    input: AdminAccountUpdate,
  ): Promise<{ outcome: AccountOutcome; user: AdminAccount | null }>;
  revokeSessions(actor: AuthIdentity, id: string): Promise<AccountOutcome>;
  credentials(actor: AuthIdentity): Promise<LoginUser | null>;
  changePassword(
    actor: AuthIdentity,
    expectedHash: string,
    newHash: string,
  ): Promise<boolean>;
}

const publicFields = `id, email, name, role, status,
  password_hash IS NULL AS "invitationRequired",
  created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt"`;
const actorCheck = `EXISTS (SELECT 1 FROM admin_users
  WHERE id = $1::uuid AND auth_version = $2::int AND status = 'active' AND role = 'owner')`;

export const accountSql = {
  list: `WITH actor AS (SELECT ${actorCheck} AS allowed), page AS (
    SELECT ${publicFields} FROM admin_users WHERE (SELECT allowed FROM actor)
    ORDER BY created_at, id LIMIT $3::int OFFSET $4::int
  ) SELECT allowed, COALESCE((SELECT jsonb_agg(page) FROM page), '[]'::jsonb) AS users,
    (SELECT count(*)::int FROM admin_users WHERE (SELECT allowed FROM actor)) AS total FROM actor`,
  update: `WITH target AS MATERIALIZED (SELECT * FROM admin_users WHERE id = $3::uuid),
  decision AS (SELECT CASE
    WHEN NOT (${actorCheck}) THEN 'forbidden'
    WHEN NOT EXISTS (SELECT 1 FROM target) THEN 'missing'
    WHEN $6::text = 'active' AND EXISTS (SELECT 1 FROM target WHERE password_hash IS NULL OR password_changed_at IS NULL)
      THEN 'activation'
    WHEN EXISTS (SELECT 1 FROM target WHERE role = 'owner' AND status = 'active'
      AND (coalesce($5::text, role) != 'owner' OR coalesce($6::text, status) != 'active'))
      AND (SELECT count(*) FROM admin_users WHERE role = 'owner' AND status = 'active') <= 1 THEN 'last_owner'
    ELSE 'ok' END AS outcome),
  changed AS (
    UPDATE admin_users u SET name = coalesce($4::text, u.name), role = coalesce($5::text, u.role),
      status = coalesce($6::text, u.status), updated_at = clock_timestamp(),
      auth_version = u.auth_version + CASE WHEN
        (coalesce($5::text, u.role) IS DISTINCT FROM u.role OR coalesce($6::text, u.status) IS DISTINCT FROM u.status)
        THEN 1 ELSE 0 END
    WHERE u.id = $3::uuid AND (SELECT outcome FROM decision) = 'ok'
      AND (coalesce($4::text, u.name) IS DISTINCT FROM u.name OR coalesce($5::text, u.role) IS DISTINCT FROM u.role
        OR coalesce($6::text, u.status) IS DISTINCT FROM u.status)
    RETURNING u.*
  ), sessions_revoked AS (
    UPDATE admin_sessions SET revoked_at = clock_timestamp() WHERE user_id = $3::uuid AND revoked_at IS NULL
      AND EXISTS (SELECT 1 FROM changed c JOIN target t ON t.id = c.id WHERE c.auth_version != t.auth_version)
  ), invitations_revoked AS (
    UPDATE admin_invitations SET revoked_at = clock_timestamp() WHERE (user_id = $3::uuid OR invited_by = $3::uuid) AND revoked_at IS NULL AND accepted_at IS NULL
      AND EXISTS (SELECT 1 FROM changed c JOIN target t ON t.id = c.id WHERE c.auth_version != t.auth_version)
  ), audited AS (
    INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, metadata)
    SELECT $1::uuid, 'user.updated', 'admin_user', c.id::text,
      jsonb_build_object('previousRole', t.role, 'role', c.role, 'previousStatus', t.status, 'status', c.status,
        'nameChanged', c.name IS DISTINCT FROM t.name)
      FROM changed c JOIN target t ON t.id = c.id
  ), result AS (SELECT ${publicFields} FROM changed UNION ALL
    SELECT ${publicFields} FROM target WHERE NOT EXISTS (SELECT 1 FROM changed))
  SELECT outcome, CASE WHEN outcome = 'ok' THEN (SELECT row_to_json(result) FROM result) ELSE NULL END AS "user" FROM decision`,
  revokeSessions: `WITH decision AS (SELECT CASE
    WHEN NOT (${actorCheck}) THEN 'forbidden'
    WHEN NOT EXISTS (SELECT 1 FROM admin_users WHERE id = $3::uuid) THEN 'missing'
    ELSE 'ok' END AS outcome), changed AS (
    UPDATE admin_users SET auth_version = auth_version + 1, updated_at = clock_timestamp()
    WHERE id = $3::uuid AND (SELECT outcome FROM decision) = 'ok' RETURNING id
  ), revoked AS (
    UPDATE admin_sessions SET revoked_at = clock_timestamp() WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM changed)
  ), audited AS (
    INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT $1::uuid, 'user.sessions_revoked', 'admin_user', id::text FROM changed
  ) SELECT outcome FROM decision`,
  credentials: `SELECT id, email, role, status, auth_version AS "authVersion", password_hash AS "passwordHash"
    FROM admin_users WHERE id = $1::uuid AND auth_version = $2::int AND status = 'active'`,
  changePassword: `WITH changed AS (
    UPDATE admin_users SET password_hash = $4, password_changed_at = clock_timestamp(),
      auth_version = auth_version + 1, updated_at = clock_timestamp()
    WHERE id = $1::uuid AND auth_version = $2::int AND password_hash = $3 AND status = 'active' RETURNING id
  ), revoked AS (
    UPDATE admin_sessions SET revoked_at = clock_timestamp() WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM changed)
  ), audited AS (
    INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT id, 'user.password_changed', 'admin_user', id::text FROM changed
  ) SELECT EXISTS (SELECT 1 FROM changed) AS changed`,
};

function query() {
  if (!process.env.DATABASE_URL)
    throw new Error("Missing database configuration");
  return neon(process.env.DATABASE_URL);
}

// Serialize account writers before checking the last-owner invariant. Each statement
// after the lock gets a fresh Read Committed snapshot, including competing changes.
export async function accountWrite(
  statement: string,
  params: (string | number | null)[],
) {
  const db = query();
  const results = await db.transaction(
    [
      db.query("SET LOCAL lock_timeout = '5s'"),
      db.query("SET LOCAL statement_timeout = '10s'"),
      db.query("LOCK TABLE public.admin_users IN SHARE ROW EXCLUSIVE MODE"),
      db.query(statement, params),
    ],
    { isolationLevel: "ReadCommitted" },
  );
  return results[3][0];
}

export const databaseAccountsStore: AccountsStore = {
  async list(actor, limit, offset) {
    const [result] = await query().query(accountSql.list, [
      actor.id,
      actor.authVersion,
      limit,
      offset,
    ]);
    return result as { allowed: boolean; users: AdminAccount[]; total: number };
  },
  async update(actor, id, input) {
    return (await accountWrite(accountSql.update, [
      actor.id,
      actor.authVersion,
      id,
      input.name ?? null,
      input.role ?? null,
      input.status ?? null,
    ])) as { outcome: AccountOutcome; user: AdminAccount | null };
  },
  async revokeSessions(actor, id) {
    return (
      await accountWrite(accountSql.revokeSessions, [
        actor.id,
        actor.authVersion,
        id,
      ])
    ).outcome as AccountOutcome;
  },
  async credentials(actor) {
    const [user] = await query().query(accountSql.credentials, [
      actor.id,
      actor.authVersion,
    ]);
    return (user as LoginUser | undefined) ?? null;
  },
  async changePassword(actor, expectedHash, newHash) {
    return (
      await accountWrite(accountSql.changePassword, [
        actor.id,
        actor.authVersion,
        expectedHash,
        newHash,
      ])
    ).changed as boolean;
  },
};
