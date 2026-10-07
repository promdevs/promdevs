import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessMigrationState,
  type MigrationFile,
} from "../src/db/migration-safety.js";

const files: MigrationFile[] = [
  {
    tag: "0000_adorable_northstar",
    when: 200,
    hash: "a",
    sql: 'CREATE TABLE "demo_users" ();',
  },
  {
    tag: "0001_projects_table",
    when: 100,
    hash: "b",
    sql: 'CREATE TABLE "projects" ();',
  },
  {
    tag: "0002_amused_beyonder",
    when: 300,
    hash: "c",
    sql: 'CREATE TABLE "projects" ();',
  },
  {
    tag: "0003_portfolio",
    when: 400,
    hash: "d",
    sql: 'DROP TABLE "demo_users"; CREATE TABLE "clients" ();',
  },
];

test("empty tables with no recorded baseline cannot replay CREATE TABLE", () => {
  const result = assessMigrationState(files, [], ["projects", "demo_users"]);
  assert.ok(
    result.issues.some((issue) => issue.includes("create projects again")),
  );
  assert.ok(
    result.issues.some((issue) => issue.includes("create demo_users again")),
  );
});
test("a fresh database also detects duplicate historical project creation", () => {
  const result = assessMigrationState(files, [], []);
  assert.ok(
    result.issues.some((issue) => issue.includes("create projects again")),
  );
});
test("a matching legacy baseline permits only the incremental portfolio migration", () => {
  const result = assessMigrationState(
    files,
    [{ hash: "c", created_at: "300" }],
    ["projects", "demo_users"],
  );
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.pending.map((file) => file.tag),
    ["0003_portfolio"],
  );
});
test("unknown history, drift, and already-existing new tables stop migration", () => {
  assert.ok(
    assessMigrationState(
      files,
      [{ hash: "changed", created_at: 300 }],
      ["projects"],
    ).issues.length,
  );
  assert.ok(
    assessMigrationState(files, [{ hash: "c", created_at: 300 }], []).issues
      .length,
  );
  assert.ok(
    assessMigrationState(
      files,
      [{ hash: "c", created_at: 300 }],
      ["projects", "clients"],
    ).issues.length,
  );
});
