import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableColumns, getTableName } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import {
  adminAuditLogs,
  adminInvitations,
  adminSessions,
  adminUsers,
  clients,
  contributors,
} from "../src/db/schema.js";

const dialect = new PgDialect();
const models = [adminUsers, adminSessions, adminInvitations, adminAuditLogs];
function checkSql(table: (typeof models)[number], name: string): string {
  const constraint = getTableConfig(table).checks.find(
    (item) => item.name === name,
  );
  assert.ok(constraint, name);
  return dialect.sqlToQuery(constraint.value).sql;
}

test("admin identities are exported by the canonical schema, separate from portfolio people", () => {
  assert.deepEqual(models.map(getTableName), [
    "admin_users",
    "admin_sessions",
    "admin_invitations",
    "admin_audit_logs",
  ]);
  for (const person of [clients, contributors])
    assert.ok(!("passwordHash" in getTableColumns(person)));
  assert.equal(adminUsers.id.getSQLType(), "uuid");
  assert.equal(adminUsers.email.notNull, true);
  assert.equal(adminUsers.role.default, "editor");
  assert.equal(adminUsers.status.default, "invited");
  assert.equal(adminUsers.authVersion.default, 1);
  assert.equal(adminUsers.passwordHash.notNull, false);
  assert.ok(
    getTableConfig(adminUsers).indexes.some(
      (item) =>
        item.config.name === "admin_users_email_unique" && item.config.unique,
    ),
  );
});

test("admin checks generate literal SQL, with normalized emails and validated hashes", () => {
  for (const table of models) {
    for (const constraint of getTableConfig(table).checks) {
      const query = dialect.sqlToQuery(constraint.value);
      assert.deepEqual(query.params, [], constraint.name);
      assert.doesNotMatch(query.sql, /\$\d+/);
    }
  }
  assert.match(checkSql(adminUsers, "admin_users_email_valid"), /lower\(btrim/);
  assert.match(
    checkSql(adminUsers, "admin_users_role_valid"),
    /'owner', 'admin', 'editor'/,
  );
  assert.match(
    checkSql(adminUsers, "admin_users_password_hash_valid"),
    /scrypt/,
  );
  assert.match(
    checkSql(adminUsers, "admin_users_active_credentials_ready"),
    /password_hash.*is not null.*password_changed_at.*is not null/,
  );
  assert.match(
    checkSql(adminUsers, "admin_users_invited_credentials_empty"),
    /password_hash.*is null.*password_changed_at.*is null/,
  );
});

test("persistent session schema stores token digests, not bearer tokens or cached roles", () => {
  const columns = getTableColumns(adminSessions);
  assert.equal(adminSessions.tokenHash.primary, true);
  assert.equal(adminSessions.authVersion.notNull, true);
  assert.equal(adminSessions.authVersion.hasDefault, false);
  assert.equal(adminSessions.expiresAt.notNull, true);
  assert.equal(
    adminSessions.createdAt.getSQLType(),
    "timestamp with time zone",
  );
  assert.ok(!("token" in columns));
  assert.ok(!("role" in columns));
  assert.match(
    checkSql(adminSessions, "admin_sessions_token_hash_valid"),
    /\{64\}/,
  );
  assert.match(
    checkSql(adminSessions, "admin_sessions_expiry_valid"),
    /expires_at.*>.*created_at/,
  );
  const key = getTableConfig(adminSessions).foreignKeys[0];
  assert.equal(getTableName(key.reference().foreignTable), "admin_users");
  assert.equal(key.onDelete, "cascade");
});

test("invitations have unique hashed tokens and one unresolved invitation per user", () => {
  const config = getTableConfig(adminInvitations);
  assert.equal(config.foreignKeys.length, 2);
  assert.ok(config.foreignKeys.every((key) => key.onDelete === "restrict"));
  const pending = config.indexes.find(
    (item) => item.config.name === "admin_invitations_pending_user_unique",
  );
  assert.ok(pending?.config.unique);
  assert.ok(pending?.config.where);
  const predicate = dialect.sqlToQuery(pending.config.where).sql;
  assert.match(predicate, /accepted_at.*is null.*revoked_at.*is null/);
  assert.match(
    checkSql(adminInvitations, "admin_invitations_terminal_state_valid"),
    /accepted_at.*is null or.*revoked_at.*is null/,
  );
  assert.match(
    checkSql(adminInvitations, "admin_invitations_acceptance_valid"),
    /accepted_at.*<.*expires_at/,
  );
  assert.ok(!("role" in getTableColumns(adminInvitations)));
});

test("security audits retain attribution and have bounded object metadata without credentials", () => {
  const config = getTableConfig(adminAuditLogs);
  assert.equal(config.foreignKeys[0].onDelete, "restrict");
  assert.equal(adminAuditLogs.actorId.notNull, false);
  assert.match(
    checkSql(adminAuditLogs, "admin_audit_logs_metadata_valid"),
    /jsonb_typeof.*'object'.*16384/,
  );
  assert.match(
    checkSql(adminAuditLogs, "admin_audit_logs_target_pair_valid"),
    /target_type.*is null.*=.*target_id.*is null/,
  );
  const columns = getTableColumns(adminAuditLogs);
  assert.ok(!("passwordHash" in columns));
  assert.ok(!("tokenHash" in columns));
  assert.ok(!("updatedAt" in columns));
});
