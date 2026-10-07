import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, isPasswordHash } from "../src/auth.js";
import {
  OwnerBootstrapError,
  ownerBootstrapSql,
  ownerBootstrapStatements,
  validateOwnerDetails,
  validateOwnerPassword,
} from "../src/access-control/owner-bootstrap.js";

test("owner details normalize email and reject invalid identifiers and terminal control characters", () => {
  assert.deepEqual(validateOwnerDetails(" OWNER@EXAMPLE.TEST ", " Owner "), {
    email: "owner@example.test",
    name: "Owner",
  });
  for (const [email, name] of [
    ["invalid", "Owner"],
    ["owner@example.test", ""],
    ["owner@example.test", "x".repeat(121)],
    ["owner@example.test", "bad\u001bname"],
    ["owner@example.test", "bad\u200bname"],
  ]) {
    assert.throws(() => validateOwnerDetails(email, name), OwnerBootstrapError);
  }
});

test("owner password requires length, nonblank content, and exact confirmation", () => {
  const password = "a unique test-only owner passphrase";
  assert.equal(validateOwnerPassword(password, password), undefined);
  assert.equal(validateOwnerPassword("T3st!pwd9", "T3st!pwd9"), undefined);
  for (const [value, confirmation] of [
    ["short", "short"],
    ["T3st!pw8", "T3st!pw8"],
    ["x".repeat(1025), "x".repeat(1025)],
    [" ".repeat(9), " ".repeat(9)],
    [password, password + " "],
  ]) {
    assert.throws(
      () => validateOwnerPassword(value, confirmation),
      OwnerBootstrapError,
    );
  }
});

test("bootstrap SQL serializes writers, refuses existing accounts, and binds every supplied value", async () => {
  const passwordHash = await hashPassword(
    "test-only owner-bootstrap passphrase",
  );
  assert.ok(isPasswordHash(passwordHash));
  const name = "O'Connor";
  const statements = ownerBootstrapStatements({
    email: "Owner@example.test",
    name,
    passwordHash,
  });
  assert.match(
    statements[2].text,
    /LOCK TABLE public\.admin_users, public\.admin_audit_logs IN SHARE ROW EXCLUSIVE MODE/,
  );
  assert.equal(statements[3].text, ownerBootstrapSql.assertEmpty);
  assert.match(
    ownerBootstrapSql.assertEmpty,
    /NOT EXISTS \(SELECT 1 FROM public\.admin_users\)/,
  );
  assert.match(ownerBootstrapSql.assertEmpty, /user\.owner_bootstrapped/);
  const insert = statements[4];
  assert.equal(insert.text, ownerBootstrapSql.insert);
  assert.match(insert.params[0], /^[a-f0-9-]{36}$/);
  assert.deepEqual(insert.params.slice(1), [
    "owner@example.test",
    name,
    passwordHash,
  ]);
  assert.deepEqual(statements[5].params, [insert.params[0]]);
  assert.deepEqual(statements[6].params, insert.params);
  const allSql = statements.map((item) => item.text).join("\n");
  assert.ok(!allSql.includes(passwordHash));
  assert.ok(!allSql.includes(name));
  assert.doesNotMatch(allSql, /UPDATE|DELETE|ON CONFLICT|DROP TABLE/i);
  assert.match(ownerBootstrapSql.insert, /'owner', 'active', now\(\)/);
  assert.doesNotMatch(ownerBootstrapSql.insert, /email_verified_at/);
  assert.match(ownerBootstrapSql.verify, /email_verified_at IS NULL/);
  assert.match(
    ownerBootstrapSql.audit,
    /VALUES \(NULL, 'user\.owner_bootstrapped'/,
  );
  assert.ok(!ownerBootstrapSql.audit.includes("password_hash"));
});

test("bootstrap plans cannot use plaintext passwords or promote an existing user", () => {
  assert.throws(
    () =>
      ownerBootstrapStatements({
        email: "owner@example.test",
        name: "Owner",
        passwordHash: "plaintext-password",
      }),
    OwnerBootstrapError,
  );
  assert.match(
    ownerBootstrapSql.state,
    /count\(\*\).*FROM public\.admin_users/,
  );
  assert.doesNotMatch(ownerBootstrapSql.insert, /UPDATE|CONFLICT/);
});
