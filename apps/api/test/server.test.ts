import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApiServer } from "../src/server.js";
import { hashPassword, verifyPassword, Sessions } from "../src/auth.js";
import { RateLimiter } from "../src/rate-limit.js";
import { projectInputSchema, contactSchema } from "@promdevs/contracts";
import { MemoryProjects } from "./fixtures.js";

const origin = "http://admin.test";
const email = "admin@example.test";
const password = "a long test-only passphrase";
const store = new MemoryProjects();
let sent = 0;
let base = "";
let passwordHash = "";
let server: ReturnType<typeof createApiServer>;
const input = {
  title: "Test project",
  slug: "test-project",
  description: "An integration test, not a real portfolio entry.",
  category: "Web",
  techStack: ["TypeScript"],
  year: 2026,
};

before(async () => {
  passwordHash = await hashPassword(password);
  server = createApiServer({
    store,
    sendEmail: async () => {
      sent++;
    },
    adminOrigin: origin,
    adminEmail: email,
    passwordHash,
    secureCookies: true,
    trustProxy: false,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No listener");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  server.close();
  server.closeAllConnections();
  await once(server, "close");
});

async function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie?: string,
  requestOrigin: string | null = origin,
) {
  return fetch(base + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(requestOrigin ? { Origin: requestOrigin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login() {
  const response = await request("/api/admin/login", "POST", {
    email,
    password,
  });
  assert.equal(response.status, 200);
  const header = response.headers.get("set-cookie")!;
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Strict/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  return header.split(";")[0];
}

test("health and public empty catalog need no login", async () => {
  assert.equal((await request("/health")).status, 200);
  const response = await request("/api/projects");
  assert.deepEqual(await response.json(), { projects: [] });
  assert.equal((await request("/api/projects/missing")).status, 404);
});
test("passwords use salted scrypt and constant-time verification", async () => {
  assert.notEqual(await hashPassword(password), passwordHash);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword("incorrect", passwordHash), false);
  assert.equal(await verifyPassword(password, "malformed"), false);
});
test("all project mutations and reads require a valid session", async () => {
  for (const [path, method, body] of [
    ["/api/admin/projects", "GET", undefined],
    ["/api/admin/projects", "POST", input],
    ["/api/admin/projects/1", "PUT", input],
    ["/api/admin/projects/1", "DELETE", undefined],
  ] as const)
    assert.equal((await request(path, method, body)).status, 401);
  assert.equal(
    (
      await request(
        "/api/admin/projects",
        "GET",
        undefined,
        "promdevs_session=forged",
      )
    ).status,
    401,
  );
});
test("cross-origin and absent-origin login are rejected", async () => {
  assert.equal(
    (
      await request(
        "/api/admin/login",
        "POST",
        { email, password },
        undefined,
        "https://attacker.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/admin/login",
        "POST",
        { email, password },
        undefined,
        null,
      )
    ).status,
    403,
  );
});
test("incorrect email and password return the same login error", async () => {
  for (const input of [
    { email: "wrong@example.test", password },
    { email, password: "incorrect" },
  ]) {
    const response = await request("/api/admin/login", "POST", input);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Invalid email or password.",
    });
  }
});

test("admin CRUD creates drafts; only published projects are public; logout revokes the token", async () => {
  const cookie = await login();
  assert.deepEqual(
    await (
      await request("/api/admin/session", "GET", undefined, cookie)
    ).json(),
    { email },
  );
  assert.equal(
    (
      await request(
        "/api/admin/projects",
        "POST",
        input,
        cookie,
        "https://attacker.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await request(
        "/api/admin/projects",
        "POST",
        { ...input, slug: "BAD SLUG" },
        cookie,
      )
    ).status,
    400,
  );
  const create = await request("/api/admin/projects", "POST", input, cookie);
  assert.equal(create.status, 201);
  const { project } = await create.json();
  assert.equal(project.slug, input.slug);
  assert.deepEqual(await (await request("/api/projects")).json(), {
    projects: [],
  });
  assert.equal((await request(`/api/projects/${input.slug}`)).status, 404);
  assert.equal(
    (
      await (
        await request("/api/admin/projects", "GET", undefined, cookie)
      ).json()
    ).projects.length,
    1,
  );
  store.setPublication(project.id, "published");
  assert.equal(
    (await request("/api/admin/projects", "POST", input, cookie)).status,
    409,
  );
  const update = await request(
    `/api/admin/projects/${project.id}`,
    "PUT",
    { ...input, title: "Refined story" },
    cookie,
  );
  assert.equal(update.status, 200);
  assert.equal(
    (await (await request(`/api/projects/${input.slug}`)).json()).project.title,
    "Refined story",
  );
  store.setPublication(project.id, "archived");
  assert.equal((await request(`/api/projects/${input.slug}`)).status, 404);
  assert.deepEqual(await (await request("/api/projects")).json(), {
    projects: [],
  });
  assert.equal(
    (
      await request(
        `/api/admin/projects/${project.id}`,
        "DELETE",
        undefined,
        cookie,
      )
    ).status,
    200,
  );
  assert.equal((await request(`/api/projects/${input.slug}`)).status, 404);
  assert.equal(
    (await request("/api/admin/logout", "POST", undefined, cookie)).status,
    200,
  );
  assert.equal(
    (await request("/api/admin/projects", "GET", undefined, cookie)).status,
    401,
  );
});
test("contact validation, honeypot, sending, and per-IP rate limit", async () => {
  const contact = {
    name: "Test visitor",
    email: "visitor@example.test",
    subject: "Test",
    message: "Test only",
    company: "",
  };
  assert.equal(
    (await request("/api/contact", "POST", { ...contact, email: "invalid" }))
      .status,
    400,
  );
  assert.equal(
    (await request("/api/contact", "POST", { ...contact, company: "spam" }))
      .status,
    400,
  );
  assert.equal(sent, 0);
  for (let index = 0; index < 3; index++)
    assert.equal((await request("/api/contact", "POST", contact)).status, 200);
  assert.equal(sent, 3);
  const blocked = await request("/api/contact", "POST", contact);
  assert.equal(blocked.status, 429);
  assert.ok(blocked.headers.get("retry-after"));
});
test("malformed JSON and oversized requests are rejected before any write", async () => {
  const response = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  const oversized = await request("/api/admin/login", "POST", {
    email,
    password: "x".repeat(70000),
  });
  assert.equal(oversized.status, 413);
});
test("login rate limit cannot be bypassed by spoofing forwarding headers", async () => {
  const response = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Forwarded-For": "203.0.113.42",
    },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 429);
});
test("sessions expire and logout removes them", () => {
  const sessions = new Sessions();
  const token = sessions.create(email, 1000);
  assert.equal(sessions.get(token, 2000)?.email, email);
  assert.equal(sessions.get(token, 1000 + sessions.maxAge * 1000), null);
  const next = sessions.create(email);
  sessions.remove(next);
  assert.equal(sessions.get(next), null);
});
test("rate limit windows reset and keys are independent", () => {
  const limiter = new RateLimiter();
  assert.equal(limiter.take("a", 1, 100, 1000).allowed, true);
  assert.equal(limiter.take("a", 1, 100, 1001).allowed, false);
  assert.equal(limiter.take("b", 1, 100, 1001).allowed, true);
  assert.equal(limiter.take("a", 1, 100, 1100).allowed, true);
});
test("contracts reject unsafe URLs, path traversal, and unknown fields", () => {
  assert.equal(
    projectInputSchema.safeParse({ ...input, liveUrl: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    projectInputSchema.safeParse({ ...input, coverImage: "/../private" })
      .success,
    false,
  );
  assert.equal(
    projectInputSchema.safeParse({ ...input, injected: true }).success,
    false,
  );
  assert.equal(
    contactSchema.safeParse({
      name: "A",
      email: "a@example.test",
      subject: "S",
      message: "M",
    }).success,
    true,
  );
});
test("unconfigured admin fails closed", async () => {
  const isolated = createApiServer({
    store,
    sendEmail: async () => {},
    adminOrigin: origin,
    adminEmail: "",
    passwordHash: "",
    secureCookies: false,
    trustProxy: false,
  });
  isolated.listen(0, "127.0.0.1");
  await once(isolated, "listening");
  const address = isolated.address();
  assert.ok(address && typeof address !== "string");
  try {
    assert.equal(
      (await fetch(`http://127.0.0.1:${address.port}/api/admin/session`))
        .status,
      503,
    );
  } finally {
    isolated.close();
    isolated.closeAllConnections();
    await once(isolated, "close");
  }
});
