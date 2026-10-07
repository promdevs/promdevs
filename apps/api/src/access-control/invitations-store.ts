import { neon } from "@neondatabase/serverless";
import type { AdminAccount, AdminInvite } from "@promdevs/contracts";
import type { AuthIdentity } from "./auth-store.js";
import { accountWrite } from "./accounts-store.js";

export type InvitationPreview = {
  name: string;
  email: string;
  role: AdminInvite["role"];
  expiresAt: string;
};
export type IssuedInvitation = {
  outcome: "ok" | "forbidden" | "missing" | "conflict";
  user: AdminAccount | null;
  invitationId: string | null;
  expiresAt: string | null;
};
export interface InvitationsStore {
  create(
    actor: AuthIdentity,
    input: AdminInvite,
    digest: string,
  ): Promise<IssuedInvitation>;
  resend(
    actor: AuthIdentity,
    id: string,
    digest: string,
  ): Promise<IssuedInvitation>;
  cancelDelivery(actorId: string, id: string): Promise<void>;
  preview(digest: string): Promise<InvitationPreview | null>;
  accept(digest: string, passwordHash: string): Promise<boolean>;
}

const fields = `id, email, name, role, status, password_hash IS NULL AS "invitationRequired", created_at AS "createdAt", updated_at AS "updatedAt", last_login_at AS "lastLoginAt"`;
const owner = `EXISTS (SELECT 1 FROM admin_users WHERE id = $1::uuid AND auth_version = $2::int AND role = 'owner' AND status = 'active')`;
const valid = `i.token_hash = $1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > clock_timestamp()
  AND u.status = 'invited' AND u.password_hash IS NULL AND inviter.role = 'owner' AND inviter.status = 'active'`;
export const invitationSql = {
  create: `WITH decision AS (SELECT CASE WHEN NOT (${owner}) THEN 'forbidden'
    WHEN EXISTS (SELECT 1 FROM admin_users WHERE email = $3) THEN 'conflict' ELSE 'ok' END AS outcome),
  recipient AS (INSERT INTO admin_users (email, name, role)
    SELECT $3, $4, $5 WHERE (SELECT outcome FROM decision) = 'ok' RETURNING *),
  invitation AS (INSERT INTO admin_invitations (user_id, invited_by, token_hash, expires_at)
    SELECT id, $1::uuid, $6, clock_timestamp() + interval '72 hours' FROM recipient RETURNING id, expires_at),
  audited AS (INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id, metadata)
    SELECT $1::uuid, 'invitation.created', 'admin_user', id::text, jsonb_build_object('role', role) FROM recipient),
  safe_user AS (SELECT ${fields} FROM recipient)
  SELECT outcome, (SELECT row_to_json(safe_user) FROM safe_user) AS "user",
    (SELECT id FROM invitation) AS "invitationId", (SELECT expires_at FROM invitation) AS "expiresAt" FROM decision`,
  resend: `WITH decision AS (SELECT CASE WHEN NOT (${owner}) THEN 'forbidden'
    WHEN NOT EXISTS (SELECT 1 FROM admin_users WHERE id = $3::uuid) THEN 'missing'
    WHEN NOT EXISTS (SELECT 1 FROM admin_users WHERE id = $3::uuid AND status IN ('invited', 'disabled') AND password_hash IS NULL AND password_changed_at IS NULL) THEN 'conflict'
    ELSE 'ok' END AS outcome), recipient AS (UPDATE admin_users SET status = 'invited', updated_at = clock_timestamp(),
      auth_version = auth_version + CASE WHEN status = 'disabled' THEN 1 ELSE 0 END
      WHERE id = $3::uuid AND (SELECT outcome FROM decision) = 'ok' RETURNING *),
  revoked AS (UPDATE admin_invitations SET revoked_at = clock_timestamp()
    WHERE user_id IN (SELECT id FROM recipient) AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id),
  invitation AS (INSERT INTO admin_invitations (user_id, invited_by, token_hash, expires_at)
    SELECT id, $1::uuid, $4, clock_timestamp() + interval '72 hours' FROM recipient
    WHERE (SELECT count(*) FROM revoked) >= 0 RETURNING id, expires_at),
  audited AS (INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT $1::uuid, 'invitation.resent', 'admin_user', id::text FROM recipient),
  safe_user AS (SELECT ${fields} FROM recipient)
  SELECT outcome, (SELECT row_to_json(safe_user) FROM safe_user) AS "user",
    (SELECT id FROM invitation) AS "invitationId", (SELECT expires_at FROM invitation) AS "expiresAt" FROM decision`,
  cancelDelivery: `WITH revoked AS (UPDATE admin_invitations SET revoked_at = clock_timestamp()
    WHERE id = $2::uuid AND invited_by = $1::uuid AND accepted_at IS NULL AND revoked_at IS NULL RETURNING user_id)
    INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT $1::uuid, 'invitation.delivery_failed', 'admin_user', user_id::text FROM revoked`,
  preview: `SELECT u.name, u.email, u.role, i.expires_at AS "expiresAt"
    FROM admin_invitations i JOIN admin_users u ON u.id = i.user_id JOIN admin_users inviter ON inviter.id = i.invited_by WHERE ${valid}`,
  accept: `WITH eligible AS (SELECT i.id, i.user_id FROM admin_invitations i
    JOIN admin_users u ON u.id = i.user_id JOIN admin_users inviter ON inviter.id = i.invited_by WHERE ${valid}),
  consumed AS (UPDATE admin_invitations SET accepted_at = clock_timestamp()
    WHERE id IN (SELECT id FROM eligible) AND accepted_at IS NULL AND revoked_at IS NULL RETURNING user_id),
  activated AS (UPDATE admin_users SET password_hash = $2, password_changed_at = clock_timestamp(),
    email_verified_at = clock_timestamp(), status = 'active', auth_version = auth_version + 1, updated_at = clock_timestamp()
    WHERE id IN (SELECT user_id FROM consumed) AND status = 'invited' RETURNING id),
  audited AS (INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
    SELECT id, 'invitation.accepted', 'admin_user', id::text FROM activated)
  SELECT EXISTS (SELECT 1 FROM activated) AS accepted`,
};
function query() {
  if (!process.env.DATABASE_URL)
    throw new Error("Missing database configuration");
  return neon(process.env.DATABASE_URL);
}
export const databaseInvitationsStore: InvitationsStore = {
  async create(actor, input, digest) {
    return (await accountWrite(invitationSql.create, [
      actor.id,
      actor.authVersion,
      input.email,
      input.name,
      input.role,
      digest,
    ])) as IssuedInvitation;
  },
  async resend(actor, id, digest) {
    return (await accountWrite(invitationSql.resend, [
      actor.id,
      actor.authVersion,
      id,
      digest,
    ])) as IssuedInvitation;
  },
  async cancelDelivery(actorId, id) {
    await accountWrite(invitationSql.cancelDelivery, [actorId, id]);
  },
  async preview(digest) {
    const [result] = await query().query(invitationSql.preview, [digest]);
    return (result as InvitationPreview | undefined) ?? null;
  },
  async accept(digest, passwordHash) {
    return (await accountWrite(invitationSql.accept, [digest, passwordHash]))
      .accepted as boolean;
  },
};
