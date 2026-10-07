import assert from "node:assert/strict";
import { before, test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { Authentication } from "../src/access-control/authentication.js";
import { authSql, type AuthStore } from "../src/access-control/auth-store.js";
import {
  hashPassword,
  sessionMaxAge,
  tokenDigest,
  sessionCookie,
} from "../src/auth.js";
import { HttpError } from "../src/errors.js";
import { createApiServer } from "../src/server.js";
import type { AdminRole } from "../src/access-control/roles.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";

const email = "owner@example.test";
const password = "isolated test-only passphrase";
let passwordHash: string;
before(async () => {
  passwordHash = await hashPassword(password);
});

function fixture(role: AdminRole = "owner") {
  const store = new MemoryAuth();
  const user = {
    id: randomUUID(),
    email,
    passwordHash,
    role,
    status: "active" as const,
    authVersion: 1,
  };
  store.users.set(user.id, user);
  return { store, user, auth: new Authentication(store) };
}
const status = (code: number) => (error: unknown) =>
  error instanceof HttpError && error.status === code;

test("database sessions store only digests and survive independent authentication instances", async () => {
  const { store, auth } = fixture();
  const { token, identity } = await auth.login(
    " OWNER@EXAMPLE.TEST ",
    password,
  );
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(store.sessions.has(token), false);
  assert.equal(store.sessions.has(tokenDigest(token)!), true);
  assert.deepEqual(Object.keys(identity).sort(), [
    "authVersion",
    "email",
    "id",
    "role",
    "status",
  ]);
  assert.equal((await new Authentication(store).session(token))?.email, email);
  assert.match(
    sessionCookie(token, true),
    /HttpOnly; SameSite=Strict; Path=\/api; Max-Age=28800; Secure/,
  );
  assert.equal(await auth.session("forged"), null);
  assert.equal(await auth.session("b".repeat(64)), null);
  store.now += sessionMaxAge * 1000;
  assert.equal(await auth.session(token), null);
});

test("login rotation and logout persistently revoke previous tokens", async () => {
  const { store, auth } = fixture();
  const first = await auth.login(email, password);
  await assert.rejects(auth.login(email, "wrong", first.token), status(401));
  assert.ok(await auth.session(first.token));
  const second = await auth.login(email, password, first.token);
  assert.notEqual(first.token, second.token);
  assert.equal(await auth.session(first.token), null);
  assert.ok(await auth.session(second.token));
  await auth.logout(second.token);
  await auth.logout(second.token);
  assert.equal(await new Authentication(store).session(second.token), null);
  assert.deepEqual(store.audits, ["auth.login", "auth.login", "auth.logout"]);
});

test("live role, account status and auth version are checked on every request", async () => {
  const { store, user, auth } = fixture();
  const { token } = await auth.login(email, password);
  store.users.set(user.id, { ...user, role: "editor" });
  assert.equal((await auth.session(token))?.role, "editor");
  store.users.set(user.id, { ...user, status: "disabled", authVersion: 2 });
  assert.equal(await auth.session(token), null);
  store.users.set(user.id, { ...user, authVersion: 2 });
  assert.equal(await auth.session(token), null);
});

test("unknown, invited, disabled and incorrect credentials receive identical errors", async () => {
  for (const state of [
    "missing",
    "invited",
    "disabled",
    "wrong-password",
  ] as const) {
    const { store, user, auth } = fixture();
    if (state === "missing") store.users.clear();
    if (state === "invited" || state === "disabled")
      store.users.set(user.id, {
        ...user,
        status: state,
        passwordHash: state === "invited" ? null : passwordHash,
      });
    await assert.rejects(
      auth.login(email, state === "wrong-password" ? "wrong" : password),
      (error: unknown) =>
        status(401)(error) &&
        (error as Error).message === "Invalid email or password.",
    );
    assert.equal(store.sessions.size, 0);
    assert.equal(store.audits.length, 0);
  }
});

test("concurrent credential or status changes prevent session issuance", async () => {
  for (const change of ["password", "version", "disable"] as const) {
    const { store, user, auth } = fixture();
    store.beforeIssue = () =>
      store.users.set(user.id, {
        ...user,
        ...(change === "password" ? { passwordHash: null } : {}),
        ...(change === "version" ? { authVersion: 2 } : {}),
        ...(change === "disable" ? { status: "disabled" } : {}),
      });
    await assert.rejects(auth.login(email, password), status(401));
    assert.equal(store.sessions.size, 0);
    assert.equal(store.audits.length, 0);
  }
});

test("database outages fail closed and never expose provider errors", async () => {
  const fail = async () => {
    throw new Error("secret database credential in provider error");
  };
  const store: AuthStore = {
    findUser: fail,
    issue: fail,
    resolve: fail,
    revoke: fail,
  };
  const auth = new Authentication(store);
  for (const operation of [
    auth.login(email, password),
    auth.session("a".repeat(64)),
    auth.logout("a".repeat(64)),
  ]) {
    await assert.rejects(
      operation,
      (error: unknown) =>
        status(503)(error) && !(error as Error).message.includes("secret"),
    );
  }
});

test("production SQL conditionally issues sessions and atomically audits login/logout", () => {
  assert.match(authSql.issue, /auth_version = \$2 AND password_hash = \$3/);
  assert.match(authSql.issue, /status = 'active'/);
  assert.match(authSql.issue, /EXISTS \(SELECT 1 FROM issued\)/);
  assert.match(authSql.issue, /'auth.login'/);
  assert.match(authSql.resolve, /s.auth_version = u.auth_version/);
  assert.match(
    authSql.resolve,
    /s.revoked_at IS NULL AND s.expires_at > now\(\)/,
  );
  assert.match(authSql.revoke, /'auth.logout'/);
});

for (const role of ["owner", "admin", "editor"] as const) {
  test(`${role} permissions are enforced by project HTTP routes, not the UI`, async () => {
    const { store: authStore, user } = fixture(role);
    const projects = new MemoryProjects();
    const origin = "http://admin.test";
    const server = createApiServer({
      store: projects,
      authStore,
      adminOrigin: origin,
      sendEmail: async () => {},
      secureCookies: false,
      trustProxy: false,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    let cookie = "";
    const request = (path: string, method = "GET", body?: unknown) =>
      fetch(base + path, {
        method,
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const input = {
      title: "Isolated fixture",
      slug: "fixture",
      description: "Test only",
      category: "Web",
      techStack: ["TypeScript"],
      year: 2026,
    };
    try {
      const login = await request("/api/admin/login", "POST", {
        email,
        password,
      });
      assert.equal(login.status, 200);
      cookie = login.headers.get("set-cookie")!.split(";")[0];
      assert.equal((await request("/api/admin/projects")).status, 200);
      const created = await request("/api/admin/projects", "POST", input);
      assert.equal(created.status, 201);
      const { project } = await created.json();
      const path = `/api/admin/projects/${project.id}`;
      assert.equal(
        (await request(path, "PUT", { ...input, title: "Draft edit" })).status,
        200,
      );
      projects.setPublication(project.id, "published");
      assert.equal(
        (await request(path, "PUT", { ...input, title: "Live edit" })).status,
        role === "editor" ? 403 : 200,
      );
      if (role === "editor") {
        assert.equal((await projects.bySlug(input.slug))?.title, "Draft edit");
        projects.setPublication(project.id, "archived");
        assert.equal((await request(path, "PUT", input)).status, 403);
      }
      assert.equal(
        (await request(path, "DELETE")).status,
        role === "editor" ? 403 : 200,
      );
      // Changing the DB role takes effect without signing in again.
      authStore.users.set(user.id, { ...user, role: "editor" });
      assert.equal((await request(path, "DELETE")).status, 403);
      authStore.users.set(user.id, {
        ...user,
        status: "disabled",
        authVersion: 2,
      });
      assert.equal((await request("/api/admin/projects")).status, 401);
      assert.equal((await request("/api/admin/session")).status, 401);
      assert.equal((await request("/api/admin/logout", "POST")).status, 200);
    } finally {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    }
  });
}
