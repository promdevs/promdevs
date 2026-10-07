import { randomUUID } from "node:crypto";
import { loginSchema } from "@promdevs/contracts";
import { isPasswordHash } from "../auth.js";

export class OwnerBootstrapError extends Error {}

export function validateOwnerDetails(email: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  if (
    normalizedEmail.length > 254 ||
    !loginSchema.shape.email.safeParse(normalizedEmail).success
  ) {
    throw new OwnerBootstrapError(
      "Enter a valid owner email (at most 254 characters).",
    );
  }
  if (
    !normalizedName ||
    normalizedName.length > 120 ||
    /[\p{Cc}\p{Cf}]/u.test(normalizedName)
  ) {
    throw new OwnerBootstrapError(
      "Enter a display name between 1 and 120 characters without control characters.",
    );
  }
  return { email: normalizedEmail, name: normalizedName };
}

export function validateOwnerPassword(
  password: string,
  confirmation: string,
): void {
  if (password.length < 16 || password.length > 1024 || !password.trim()) {
    throw new OwnerBootstrapError(
      "Use a password between 16 and 1024 characters, not just whitespace.",
    );
  }
  if (password !== confirmation)
    throw new OwnerBootstrapError("Passwords do not match.");
}

export const ownerBootstrapSql = {
  tables: `SELECT
    to_regclass('public.admin_users') IS NOT NULL
    AND to_regclass('public.admin_sessions') IS NOT NULL
    AND to_regclass('public.admin_invitations') IS NOT NULL
    AND to_regclass('public.admin_audit_logs') IS NOT NULL AS ready`,
  state: `SELECT
    (SELECT count(*)::int FROM public.admin_users) AS users,
    (SELECT count(*)::int FROM public.admin_audit_logs WHERE action = 'user.owner_bootstrapped') AS bootstraps`,
  assertEmpty: `SELECT 1 / CASE WHEN
    NOT EXISTS (SELECT 1 FROM public.admin_users)
    AND NOT EXISTS (SELECT 1 FROM public.admin_audit_logs WHERE action = 'user.owner_bootstrapped')
    THEN 1 ELSE 0 END AS bootstrap_allowed`,
  insert: `INSERT INTO public.admin_users (id, email, name, password_hash, role, status, password_changed_at)
    VALUES ($1::uuid, $2, $3, $4, 'owner', 'active', now()) RETURNING id`,
  audit: `INSERT INTO public.admin_audit_logs (actor_id, action, target_type, target_id, metadata)
    VALUES (NULL, 'user.owner_bootstrapped', 'admin_user', $1,
      '{"role":"owner","method":"interactive_cli"}'::jsonb) RETURNING id`,
  verify: `SELECT 1 / CASE WHEN
    (SELECT count(*) FROM public.admin_users) = 1
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE id = $1::uuid AND email = $2 AND name = $3
      AND password_hash = $4 AND role = 'owner' AND status = 'active' AND auth_version = 1
      AND password_changed_at IS NOT NULL AND email_verified_at IS NULL)
    AND (SELECT count(*) FROM public.admin_audit_logs
      WHERE action = 'user.owner_bootstrapped' AND actor_id IS NULL
        AND target_type = 'admin_user' AND target_id = $1::text) = 1
    THEN 1 ELSE 0 END AS bootstrap_verified`,
} as const;

export function ownerBootstrapStatements(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const details = validateOwnerDetails(input.email, input.name);
  if (!isPasswordHash(input.passwordHash)) {
    throw new OwnerBootstrapError("A valid salted password hash is required.");
  }
  const id = randomUUID();
  const parameters = [id, details.email, details.name, input.passwordHash];
  return [
    { text: "SET LOCAL lock_timeout = '10s'", params: [] },
    { text: "SET LOCAL statement_timeout = '20s'", params: [] },
    // Serialize against other bootstrap attempts and ordinary account/audit writers.
    {
      text: "LOCK TABLE public.admin_users, public.admin_audit_logs IN SHARE ROW EXCLUSIVE MODE",
      params: [],
    },
    { text: ownerBootstrapSql.assertEmpty, params: [] },
    { text: ownerBootstrapSql.insert, params: parameters },
    { text: ownerBootstrapSql.audit, params: [id] },
    { text: ownerBootstrapSql.verify, params: parameters },
  ];
}
