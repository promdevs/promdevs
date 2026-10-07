import assert from "node:assert/strict";
import { before, test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import {
  adminAccountUpdateSchema,
  adminInviteSchema,
  adminPasswordChangeSchema,
  invitationAcceptSchema,
  adminUsersResponseSchema,
} from "@promdevs/contracts";
import { hashPassword, tokenDigest } from "../src/auth.js";
import { accountSql } from "../src/access-control/accounts-store.js";
import {
  Invitations,
  type InvitationEmail,
} from "../src/access-control/invitations.js";
import { createApiServer } from "../src/server.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";
import { MemoryAccounts, MemoryInvitations } from "./account-fixtures.js";
import type { AdminRole } from "../src/access-control/roles.js";

const password = "a test-only account passphrase";
let hash: string;
before(async () => {
  hash = await hashPassword(password);
});
function fixture(role: AdminRole = "owner") {
  const auth = new MemoryAuth();
  const user = {
    id: randomUUID(),
    email: "owner@example.test",
    passwordHash: hash,
    role,
    status: "active" as const,
    authVersion: 1,
  };
  auth.users.set(user.id, user);
  const accounts = new MemoryAccounts(auth);
  const invites = new MemoryInvitations(accounts);
  const emails: InvitationEmail[] = [];
  const mailer = {
    configured: () => true,
    send: async (email: InvitationEmail) => {
      emails.push(email);
    },
  };
  return { auth, user, accounts, invites, emails, mailer };
}
async function app(role: AdminRole = "owner") {
  const data = fixture(role);
  const origin = "http://admin.test";
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: data.auth,
    accountsStore: data.accounts,
    invitationsStore: data.invites,
    invitationMailer: data.mailer,
    sendEmail: async () => {},
    adminOrigin: origin,
    secureCookies: false,
    trustProxy: false,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  let cookie = "";
  const request = (
    path: string,
    method = "GET",
    body?: unknown,
    ownCookie = cookie,
    requestOrigin = origin,
  ) =>
    fetch(base + "/api/admin" + path, {
      method,
      headers: {
        Origin: requestOrigin,
        Cookie: ownCookie,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const logged = await request("/login", "POST", {
    email: data.user.email,
    password,
  });
  assert.equal(logged.status, 200);
  cookie = logged.headers.get("set-cookie")!.split(";")[0];
  return {
    ...data,
    request,
    cookie,
    close: async () => {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    },
  };
}

test("account inputs reject privilege injection, invalid names, weak passwords and unknown fields", () => {
  for (const value of [
    {},
    { role: "superadmin" },
    { status: "invited" },
    { email: "changed@example.test" },
    { passwordHash: hash },
    { authVersion: 9 },
    { name: "bad\u001bname" },
  ])
    assert.equal(adminAccountUpdateSchema.safeParse(value).success, false);
  assert.equal(
    adminInviteSchema.parse({ name: "Test", email: " PERSON@EXAMPLE.TEST " })
      .role,
    "editor",
  );
  assert.equal(
    adminInviteSchema.parse({ name: "Test", email: " PERSON@EXAMPLE.TEST " })
      .email,
    "person@example.test",
  );
  for (const value of [
    { currentPassword: password, newPassword: "short", confirmation: "short" },
    {
      currentPassword: password,
      newPassword: password,
      confirmation: password,
    },
  ])
    assert.equal(adminPasswordChangeSchema.safeParse(value).success, false);
  assert.equal(
    invitationAcceptSchema.safeParse({
      token: "a".repeat(64),
      password: " ".repeat(9),
      confirmation: " ".repeat(9),
    }).success,
    false,
  );
});
test("invitation and password-change validation accept nine characters, not eight", () => {
  for (const [candidate, valid] of [
    ["T3st!pwd9", true],
    ["T3st!pw8", false],
    [" ".repeat(9), false],
    ["x".repeat(1025), false],
  ] as const) {
    assert.equal(
      invitationAcceptSchema.safeParse({
        token: "a".repeat(64),
        password: candidate,
        confirmation: candidate,
      }).success,
      valid,
    );
    assert.equal(
      adminPasswordChangeSchema.safeParse({
        currentPassword: password,
        newPassword: candidate,
        confirmation: candidate,
      }).success,
      valid,
    );
  }
  assert.equal(
    invitationAcceptSchema.safeParse({
      token: "a".repeat(64),
      password: "T3st!pwd9",
      confirmation: "N3w!pass9",
    }).success,
    false,
  );
});
test("owner APIs list an allowlist, validate pagination and protect the last active owner", async () => {
  const api = await app();
  try {
    const response = await api.request("/users");
    assert.equal(response.status, 200);
    const body = adminUsersResponseSchema.parse(await response.json());
    assert.equal(body.total, 1);
    assert.ok(!JSON.stringify(body).includes(hash));
    for (const path of [
      "/users?limit=999",
      "/users?limit=1&limit=2",
      "/users?search=test",
      "/users?offset=-1",
    ])
      assert.equal((await api.request(path)).status, 400);
    for (const input of [{ role: "admin" }, { status: "disabled" }])
      assert.equal(
        (await api.request(`/users/${api.user.id}`, "PATCH", input)).status,
        409,
      );
    assert.equal(
      (
        await api.request(`/users/${api.user.id}`, "PATCH", {
          name: "Refined name",
        })
      ).status,
      200,
    );
    assert.equal((await api.request("/me")).status, 200);
    assert.equal(
      (await api.request(`/users/${api.user.id}`, "PATCH", { authVersion: 3 }))
        .status,
      400,
    );
    assert.equal(
      (
        await api.request(
          `/users/${api.user.id}`,
          "PATCH",
          { name: "Attack" },
          api.cookie,
          "https://attacker.test",
        )
      ).status,
      403,
    );
  } finally {
    await api.close();
  }
});
for (const role of ["admin", "editor"] as const)
  test(`${role} cannot access or mutate administrator accounts`, async () => {
    const api = await app(role);
    try {
      for (const [path, method, body] of [
        ["/users", "GET", undefined],
        [`/users/${api.user.id}`, "PATCH", { role: "owner" }],
        [`/users/${api.user.id}/sessions/revoke`, "POST", undefined],
        [
          "/users/invitations",
          "POST",
          { name: "Test", email: "person@example.test" },
        ],
      ] as const)
        assert.equal((await api.request(path, method, body)).status, 403);
      assert.equal((await api.request("/me")).status, 200);
      assert.equal(api.emails.length, 0);
    } finally {
      await api.close();
    }
  });
test("invite, resend, single-use acceptance and role changes work through HTTP without exposing tokens", async () => {
  const api = await app();
  const password = "T3st!pwd9";
  try {
    const input = {
      name: "New editor",
      email: "editor@example.test",
      role: "editor",
    };
    const response = await api.request("/users/invitations", "POST", input);
    assert.equal(response.status, 201);
    const body = await response.json();
    const first = new URL(api.emails[0].url).hash.slice("#invite=".length);
    assert.equal(body.user.status, "invited");
    assert.ok(!JSON.stringify(body).includes(first));
    assert.ok(api.invites.entries.has(tokenDigest(first)!));
    assert.ok(!api.invites.entries.has(first));
    assert.equal(
      (
        await api.request(`/users/${body.user.id}`, "PATCH", {
          status: "active",
        })
      ).status,
      409,
    );
    assert.equal(
      (await api.request(`/users/${body.user.id}/invitation`, "POST")).status,
      200,
    );
    const next = new URL(api.emails[1].url).hash.slice("#invite=".length);
    assert.equal(
      (await api.request("/invitations/preview", "POST", { token: first }, ""))
        .status,
      400,
    );
    assert.equal(
      (await api.request("/invitations/preview", "POST", { token: next }, ""))
        .status,
      200,
    );
    const accept = { token: next, password, confirmation: password };
    assert.equal(
      (
        await api.request(
          "/invitations/accept",
          "POST",
          accept,
          "",
          "https://attacker.test",
        )
      ).status,
      403,
    );
    assert.equal(
      (await api.request("/invitations/accept", "POST", accept, "")).status,
      200,
    );
    assert.equal(
      (await api.request("/invitations/accept", "POST", accept, "")).status,
      400,
    );
    const login = await api.request(
      "/login",
      "POST",
      { email: input.email, password },
      "",
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    assert.equal(
      (await api.request("/users", "GET", undefined, cookie)).status,
      403,
    );
    assert.equal(
      (await api.request(`/users/${body.user.id}`, "PATCH", { role: "admin" }))
        .status,
      200,
    );
    assert.equal(
      (await api.request("/me", "GET", undefined, cookie)).status,
      401,
    );
  } finally {
    await api.close();
  }
});
test("password changes require the current password and revoke all sessions including the caller", async () => {
  const api = await app("editor");
  try {
    const newPassword = "N3w!pass9";
    assert.equal(
      (
        await api.request("/password", "POST", {
          currentPassword: "wrong",
          newPassword,
          confirmation: newPassword,
        })
      ).status,
      400,
    );
    const changed = await api.request("/password", "POST", {
      currentPassword: password,
      newPassword,
      confirmation: newPassword,
    });
    assert.equal(changed.status, 200);
    assert.match(changed.headers.get("set-cookie")!, /Max-Age=0/);
    assert.equal((await api.request("/me")).status, 401);
    assert.equal(
      (
        await api.request(
          "/login",
          "POST",
          { email: api.user.email, password },
          "",
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await api.request(
          "/login",
          "POST",
          { email: api.user.email, password: newPassword },
          "",
        )
      ).status,
      200,
    );
  } finally {
    await api.close();
  }
});
test("explicit self session revocation signs out the owner without disabling the account", async () => {
  const api = await app();
  try {
    assert.equal(
      (await api.request(`/users/${api.user.id}/sessions/revoke`, "POST"))
        .status,
      200,
    );
    assert.equal((await api.request("/me")).status, 401);
    assert.equal(api.auth.users.get(api.user.id)?.status, "active");
  } finally {
    await api.close();
  }
});
test("missing email configuration makes no account write; failed delivery invalidates only its link", async () => {
  const data = fixture();
  const actor = data.user;
  const unconfigured = new Invitations(
    data.invites,
    { configured: () => false, send: async () => {} },
    "https://admin.test",
  );
  await assert.rejects(
    unconfigured.create(actor, {
      name: "Test",
      email: "person@example.test",
      role: "editor",
    }),
    { status: 503 },
  );
  assert.equal(data.auth.users.size, 1);
  const failed = new Invitations(
    data.invites,
    {
      configured: () => true,
      send: async () => {
        throw new Error("provider secret");
      },
    },
    "https://admin.test",
  );
  await assert.rejects(
    failed.create(actor, {
      name: "Test",
      email: "person@example.test",
      role: "editor",
    }),
    (error: unknown) =>
      error instanceof Error && !error.message.includes("provider secret"),
  );
  assert.equal(data.auth.users.size, 2);
  assert.ok([...data.invites.entries.values()].every((entry) => entry.revoked));
});
test("expired invitations fail before password hashing or activation", async () => {
  const data = fixture();
  const service = new Invitations(
    data.invites,
    data.mailer,
    "https://admin.test",
  );
  await service.create(data.user, {
    name: "Test",
    email: "person@example.test",
    role: "editor",
  });
  const token = new URL(data.emails[0].url).hash.slice("#invite=".length);
  data.auth.now += 72 * 60 * 60 * 1000;
  await assert.rejects(service.accept(token, password), { status: 400 });
  assert.equal(
    [...data.auth.users.values()].filter((user) => user.status === "active")
      .length,
    1,
  );
});
test("account SQL checks the live owner/version, locks writers and revokes access atomically", () => {
  assert.match(accountSql.update, /role = 'owner'/);
  assert.match(accountSql.update, /auth_version = \$2::int/);
  assert.match(accountSql.update, /THEN 'last_owner'/);
  assert.match(accountSql.update, /sessions_revoked/);
  assert.match(accountSql.update, /invitations_revoked/);
  assert.match(accountSql.update, /INSERT INTO admin_audit_logs/);
  assert.match(accountSql.changePassword, /password_hash = \$3/);
  assert.match(accountSql.changePassword, /auth_version = auth_version \+ 1/);
});
