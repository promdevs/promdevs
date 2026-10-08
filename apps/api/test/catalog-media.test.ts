import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { MAX_PROJECT_IMAGE_BYTES } from "@promdevs/contracts";
import { createApiServer } from "../src/server.js";
import { hashPassword } from "../src/auth.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";
import { MemoryCatalog } from "./catalog-fixtures.js";
import { validateImage } from "../src/storage/policy.js";
import { StorageError } from "../src/storage/config.js";
import { catalogListSql, catalogUploadAuditSql } from "../src/catalog.js";

const png = Buffer.alloc(24);
Buffer.from("89504e470d0a1a0a", "hex").copy(png);
png.write("IHDR", 12, "ascii");

async function fixture(role: "owner" | "admin" | "editor" = "owner") {
  const auth = new MemoryAuth();
  const id = randomUUID();
  auth.users.set(id, {
    id,
    email: "media@isolated.test",
    role,
    status: "active",
    authVersion: 1,
    passwordHash: await hashPassword("isolated password"),
  });
  const catalog = new MemoryCatalog(auth);
  const paths: string[] = [];
  const scopes: string[] = [];
  const removed: string[] = [];
  let invalidate = false;
  let ready = true;
  let uploadFailure = false;
  let hold: (() => Promise<void>) | undefined;
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: auth,
    catalogStore: catalog,
    adminOrigin: "http://admin.test",
    secureCookies: false,
    trustProxy: false,
    sendEmail: async () => {},
    mediaUploader: {
      ready: () => {
        if (!ready)
          throw new StorageError("configuration", "Storage unavailable.");
      },
      upload: async (file, scope = "projects") => {
        paths.push(file.path);
        scopes.push(scope);
        const bytes = await readFile(file.path);
        validateImage(bytes, file.contentType);
        if (hold) await hold();
        if (uploadFailure)
          throw new StorageError("provider", "Storage request failed.");
        if (invalidate) auth.users.get(id)!.authVersion++;
        const key = `images/${scope}/${randomUUID()}.png`;
        return {
          type: "image",
          key,
          src: "https://media.example.test/" + key,
          contentType: file.contentType,
          size: file.size,
          width: 512,
          height: 512,
        };
      },
      remove: async (key) => {
        removed.push(key);
      },
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const login = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "http://admin.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "media@isolated.test",
      password: "isolated password",
    }),
  });
  const headers = {
    Cookie: login.headers.get("set-cookie")!.split(";")[0],
    Origin: "http://admin.test",
    "Content-Type": "image/png",
  };
  return {
    base,
    headers,
    paths,
    scopes,
    removed,
    catalog,
    invalidate: () => {
      invalidate = true;
    },
    unready: () => {
      ready = false;
    },
    fail: () => {
      uploadFailure = true;
    },
    hold: (wait: () => Promise<void>) => {
      hold = wait;
    },
    upload: (kind = "clients", override = {}) =>
      fetch(`${base}/api/admin/catalog/${kind}/media`, {
        method: "POST",
        headers: { ...headers, ...override },
        body: png,
      }),
    close: async () => {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    },
  };
}

for (const role of ["owner", "admin", "editor"] as const)
  test(`${role} can upload scoped client and skill images without altering records`, async () => {
    const f = await fixture(role);
    try {
      for (const kind of ["clients", "skills"]) {
        const response = await f.upload(kind);
        assert.equal(response.status, 201);
        const { media } = await response.json();
        assert.match(media.key, new RegExp(`^images/${kind}/`));
        assert.equal(media.type, "image");
      }
      assert.deepEqual(f.scopes, ["clients", "skills"]);
      assert.equal(f.catalog.rows.clients.size, 0);
      assert.equal(f.catalog.rows.skills.size, 0);
      assert.equal(f.catalog.audits.length, 2);
      for (const path of f.paths) await assert.rejects(() => access(path));
    } finally {
      await f.close();
    }
  });

test("catalog images require authentication, same origin, image bytes and bounded sizes", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.upload("clients", { Cookie: "" })).status, 401);
    assert.equal(
      (await f.upload("clients", { Origin: "https://evil.test" })).status,
      403,
    );
    for (const type of ["image/svg+xml", "video/mp4", "application/json"])
      assert.equal(
        (await f.upload("skills", { "Content-Type": type })).status,
        415,
      );
    const url = f.base + "/api/admin/catalog/clients/media";
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: f.headers,
          body: "invalid image",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(url, {
          method: "POST",
          headers: f.headers,
          body: Buffer.alloc(0),
        })
      ).status,
      400,
    );
    const tooLarge = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(
        url,
        {
          method: "POST",
          headers: {
            ...f.headers,
            "Content-Length": String(MAX_PROJECT_IMAGE_BYTES + 1),
          },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode!);
        },
      );
      request.on("error", reject);
      request.end();
    });
    assert.equal(tooLarge, 413);
    assert.equal((await f.upload("reviews")).status, 400);
    assert.equal(f.catalog.audits.length, 0);
    for (const path of f.paths) await assert.rejects(() => access(path));
  } finally {
    await f.close();
  }
});

test("storage failure and session revocation do not attach images, and clean temporary files", async () => {
  for (const mode of ["failure", "revocation", "unconfigured"] as const) {
    const f = await fixture();
    try {
      if (mode === "failure") f.fail();
      else if (mode === "revocation") f.invalidate();
      else f.unready();
      assert.equal(
        (await f.upload()).status,
        mode === "revocation" ? 401 : 503,
      );
      assert.equal(f.catalog.audits.length, 0);
      assert.equal(f.removed.length, mode === "revocation" ? 1 : 0);
      for (const path of f.paths) await assert.rejects(() => access(path));
    } finally {
      await f.close();
    }
  }
});

test("catalog upload rate is limited per account", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 10; i++) assert.equal((await f.upload()).status, 201);
    const response = await f.upload("skills");
    assert.equal(response.status, 429);
    assert.ok(response.headers.get("retry-after"));
    assert.equal(f.scopes.length, 10);
  } finally {
    await f.close();
  }
});

test("catalog upload concurrency is capped at two", async () => {
  const f = await fixture();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = 0;
  let notify!: () => void;
  const bothStarted = new Promise<void>((resolve) => {
    notify = resolve;
  });
  f.hold(async () => {
    if (++started === 2) notify();
    await gate;
  });
  try {
    const first = f.upload(),
      second = f.upload("skills");
    await bothStarted;
    assert.equal((await f.upload()).status, 503);
    release();
    assert.equal((await first).status, 201);
    assert.equal((await second).status, 201);
  } finally {
    release();
    await f.close();
  }
});

test("catalog SQL lists image URLs without contacts and rechecks the uploader atomically", () => {
  for (const kind of ["clients", "skills"] as const) {
    const sql = catalogUploadAuditSql(kind);
    assert.match(sql, /auth_version=\$2/);
    assert.match(sql, /FOR SHARE/);
    assert.match(sql, /INSERT INTO admin_audit_logs/);
    assert.match(sql, /'media',\$3::text/);
    assert.match(catalogListSql(kind), /'imageUrl',image_url/);
  }
});
