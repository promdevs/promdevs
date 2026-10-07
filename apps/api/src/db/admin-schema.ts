import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  adminRoles,
  adminUserStatuses,
  type AdminRole,
  type AdminUserStatus,
} from "../access-control/roles.js";

const valuesSql = (values: readonly string[]) =>
  sql.join(
    values.map((value) => sql.raw(`'${value.replaceAll("'", "''")}'`)),
    sql`, `,
  );
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Administrator identities are separate from clients and portfolio contributors.
export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    role: text("role").$type<AdminRole>().notNull().default("editor"),
    status: text("status")
      .$type<AdminUserStatus>()
      .notNull()
      .default("invited"),
    authVersion: integer("auth_version").notNull().default(1),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("admin_users_email_unique").on(table.email),
    check(
      "admin_users_email_valid",
      sql`${table.email} = lower(btrim(${table.email})) and length(${table.email}) between 3 and 254 and ${table.email} ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'`,
    ),
    check(
      "admin_users_name_valid",
      sql`length(btrim(${table.name})) between 1 and 120`,
    ),
    check(
      "admin_users_role_valid",
      sql`${table.role} in (${valuesSql(adminRoles)})`,
    ),
    check(
      "admin_users_status_valid",
      sql`${table.status} in (${valuesSql(adminUserStatuses)})`,
    ),
    check("admin_users_auth_version_valid", sql`${table.authVersion} > 0`),
    check(
      "admin_users_password_hash_valid",
      sql`${table.passwordHash} is null or ${table.passwordHash} ~ '^scrypt[$][a-f0-9]{32}[$][a-f0-9]{128}$'`,
    ),
    check(
      "admin_users_active_credentials_ready",
      sql`${table.status} != 'active' or (${table.passwordHash} is not null and ${table.passwordChangedAt} is not null)`,
    ),
    check(
      "admin_users_invited_credentials_empty",
      sql`${table.status} != 'invited' or (${table.passwordHash} is null and ${table.passwordChangedAt} is null)`,
    ),
    index("admin_users_status_role_idx").on(table.status, table.role),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    authVersion: integer("auth_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "admin_sessions_token_hash_valid",
      sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check("admin_sessions_auth_version_valid", sql`${table.authVersion} > 0`),
    check(
      "admin_sessions_expiry_valid",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "admin_sessions_last_seen_valid",
      sql`${table.lastSeenAt} is null or ${table.lastSeenAt} >= ${table.createdAt}`,
    ),
    check(
      "admin_sessions_revocation_valid",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`,
    ),
    index("admin_sessions_user_id_idx").on(table.userId),
    index("admin_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const adminInvitations = pgTable(
  "admin_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("admin_invitations_token_hash_unique").on(table.tokenHash),
    uniqueIndex("admin_invitations_pending_user_unique")
      .on(table.userId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
    check(
      "admin_invitations_token_hash_valid",
      sql`${table.tokenHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "admin_invitations_not_self",
      sql`${table.userId} != ${table.invitedBy}`,
    ),
    check(
      "admin_invitations_expiry_valid",
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      "admin_invitations_terminal_state_valid",
      sql`${table.acceptedAt} is null or ${table.revokedAt} is null`,
    ),
    check(
      "admin_invitations_acceptance_valid",
      sql`${table.acceptedAt} is null or (${table.acceptedAt} >= ${table.createdAt} and ${table.acceptedAt} < ${table.expiresAt})`,
    ),
    check(
      "admin_invitations_revocation_valid",
      sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`,
    ),
    index("admin_invitations_invited_by_idx").on(table.invitedBy),
    index("admin_invitations_expires_at_idx").on(table.expiresAt),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // NULL is reserved for system/bootstrap actions, not a substitute for attribution.
    actorId: uuid("actor_id").references(() => adminUsers.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "admin_audit_logs_action_valid",
      sql`length(${table.action}) <= 80 and ${table.action} ~ '^[a-z][a-z0-9_]*([.][a-z][a-z0-9_]*)+$'`,
    ),
    check(
      "admin_audit_logs_target_pair_valid",
      sql`(${table.targetType} is null) = (${table.targetId} is null)`,
    ),
    check(
      "admin_audit_logs_target_type_valid",
      sql`${table.targetType} is null or (length(${table.targetType}) <= 64 and ${table.targetType} ~ '^[a-z][a-z0-9_]*$')`,
    ),
    check(
      "admin_audit_logs_target_id_valid",
      sql`${table.targetId} is null or length(btrim(${table.targetId})) between 1 and 128`,
    ),
    check(
      "admin_audit_logs_metadata_valid",
      sql`jsonb_typeof(${table.metadata}) = 'object' and octet_length(${table.metadata}::text) <= 16384`,
    ),
    index("admin_audit_logs_actor_created_idx").on(
      table.actorId,
      table.createdAt,
    ),
    index("admin_audit_logs_target_created_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
  receivedInvitations: many(adminInvitations, {
    relationName: "invitationRecipient",
  }),
  sentInvitations: many(adminInvitations, { relationName: "invitationSender" }),
  auditLogs: many(adminAuditLogs),
}));
export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminSessions.userId],
    references: [adminUsers.id],
  }),
}));
export const adminInvitationsRelations = relations(
  adminInvitations,
  ({ one }) => ({
    user: one(adminUsers, {
      fields: [adminInvitations.userId],
      references: [adminUsers.id],
      relationName: "invitationRecipient",
    }),
    inviter: one(adminUsers, {
      fields: [adminInvitations.invitedBy],
      references: [adminUsers.id],
      relationName: "invitationSender",
    }),
  }),
);
export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  actor: one(adminUsers, {
    fields: [adminAuditLogs.actorId],
    references: [adminUsers.id],
  }),
}));

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminSessionRecord = typeof adminSessions.$inferSelect;
export type NewAdminSessionRecord = typeof adminSessions.$inferInsert;
export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type NewAdminInvitation = typeof adminInvitations.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
