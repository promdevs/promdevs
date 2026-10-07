import { neon } from "@neondatabase/serverless";
import type { AdminUser } from "../db/admin-schema.js";
import { sessionMaxAge } from "../auth.js";

export type AuthIdentity = Pick<
  AdminUser,
  "id" | "email" | "role" | "status" | "authVersion"
>;
export type LoginUser = AuthIdentity & Pick<AdminUser, "passwordHash">;

export interface AuthStore {
  findUser(email: string): Promise<LoginUser | null>;
  issue(
    user: LoginUser,
    digest: string,
    previousDigest: string | null,
  ): Promise<AuthIdentity | null>;
  resolve(digest: string): Promise<AuthIdentity | null>;
  revoke(digest: string): Promise<void>;
}

// Fixed SQL with bound values. CTEs keep session issuance, rotation and audit atomic.
export const authSql = {
  findUser: `SELECT id, email, role, status, auth_version AS "authVersion",
    password_hash AS "passwordHash" FROM admin_users WHERE email = $1`,
  issue: `WITH eligible AS (
    UPDATE admin_users SET last_login_at = now(), updated_at = now()
    WHERE id = $1 AND auth_version = $2 AND password_hash = $3
      AND status = 'active' AND role IN ('owner', 'admin', 'editor')
    RETURNING id, email, role, status, auth_version
  ), issued AS (
    INSERT INTO admin_sessions (token_hash, user_id, auth_version, expires_at)
    SELECT $4, id, auth_version, now() + ($6::int * interval '1 second') FROM eligible
    RETURNING user_id
  ), rotated AS (
    UPDATE admin_sessions SET revoked_at = now()
    WHERE token_hash = $5 AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM issued)
    RETURNING user_id
  ), audited AS (
    INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT user_id, 'auth.login', 'admin_user', user_id::text FROM issued
  ) SELECT id, email, role, status, auth_version AS "authVersion" FROM eligible`,
  resolve: `SELECT u.id, u.email, u.role, u.status, u.auth_version AS "authVersion"
    FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now()
      AND s.auth_version = u.auth_version AND u.status = 'active'
      AND u.role IN ('owner', 'admin', 'editor')`,
  revoke: `WITH revoked AS (
    UPDATE admin_sessions SET revoked_at = now()
    WHERE token_hash = $1 AND revoked_at IS NULL RETURNING user_id
  ) INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT user_id, 'auth.logout', 'admin_user', user_id::text FROM revoked`,
};

function query() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Database authentication is not configured");
  return neon(url);
}

export const databaseAuthStore: AuthStore = {
  async findUser(email) {
    const [row] = await query().query(authSql.findUser, [email]);
    return (row as LoginUser | undefined) ?? null;
  },
  async issue(user, digest, previousDigest) {
    const [row] = await query().query(authSql.issue, [
      user.id,
      user.authVersion,
      user.passwordHash,
      digest,
      previousDigest,
      sessionMaxAge,
    ]);
    return (row as AuthIdentity | undefined) ?? null;
  },
  async resolve(digest) {
    const [row] = await query().query(authSql.resolve, [digest]);
    return (row as AuthIdentity | undefined) ?? null;
  },
  async revoke(digest) {
    await query().query(authSql.revoke, [digest]);
  },
};
