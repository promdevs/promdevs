import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminPermissions,
  adminRoles,
  adminUserStatuses,
  isAdminRole,
  roleHasPermission,
  userHasPermission,
} from "../src/access-control/roles.js";

test("roles and account states are fixed, without implicit privileges", () => {
  assert.deepEqual(adminRoles, ["owner", "admin", "editor"]);
  assert.deepEqual(adminUserStatuses, ["invited", "active", "disabled"]);
  for (const role of adminRoles) assert.ok(isAdminRole(role));
  for (const role of [
    null,
    undefined,
    "",
    "Owner",
    "superadmin",
    "__proto__",
    "constructor",
    {},
  ]) {
    assert.equal(isAdminRole(role), false);
    for (const permission of adminPermissions)
      assert.equal(roleHasPermission(role, permission), false);
  }
  for (const role of adminRoles) {
    for (const permission of [
      null,
      undefined,
      "*",
      "users.delete",
      "__proto__",
      {},
    ]) {
      assert.equal(roleHasPermission(role, permission), false);
    }
  }
});

test("the owner has every defined permission", () => {
  for (const permission of adminPermissions)
    assert.ok(roleHasPermission("owner", permission));
});

test("admins manage content and media, but cannot manage users or read security audits", () => {
  const expected = new Set([
    "content.read",
    "content.create",
    "content.edit_draft",
    "content.edit_published",
    "content.publish",
    "content.delete",
    "media.upload",
    "media.delete",
  ]);
  for (const permission of adminPermissions)
    assert.equal(
      roleHasPermission("admin", permission),
      expected.has(permission),
    );
});

test("editors can edit drafts, not modify published content or bypass publishing", () => {
  const expected = new Set([
    "content.read",
    "content.create",
    "content.edit_draft",
    "media.upload",
  ]);
  for (const permission of adminPermissions)
    assert.equal(
      roleHasPermission("editor", permission),
      expected.has(permission),
    );
});

test("inactive, missing, and unknown users are denied even when their role is owner", () => {
  for (const role of adminRoles) {
    for (const status of ["invited", "disabled", "unknown", null]) {
      for (const permission of adminPermissions)
        assert.equal(userHasPermission({ role, status }, permission), false);
    }
  }
  assert.equal(userHasPermission(null, "content.read"), false);
  assert.equal(userHasPermission(undefined, "content.read"), false);
  assert.equal(
    userHasPermission({ role: "unknown", status: "active" }, "content.read"),
    false,
  );
  for (const role of adminRoles) {
    for (const permission of adminPermissions)
      assert.equal(
        userHasPermission({ role, status: "active" }, permission),
        roleHasPermission(role, permission),
      );
  }
});
