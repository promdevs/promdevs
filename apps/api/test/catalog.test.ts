import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { catalogInputs, catalogKinds } from "@promdevs/contracts";
import { hashPassword } from "../src/auth.js";
import { createApiServer } from "../src/server.js";
import { catalogSaveSql, catalogStateSql } from "../src/catalog.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";
import { MemoryCatalog } from "./catalog-fixtures.js";
async function fixture(role: "owner" | "admin" | "editor" = "owner") {
  const auth = new MemoryAuth();
  const id = randomUUID();
  const password = "test password";
  auth.users.set(id, {
    id,
    email: "catalog@example.test",
    role,
    status: "active",
    authVersion: 1,
    passwordHash: await hashPassword(password),
  });
  const catalog = new MemoryCatalog(auth);
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: auth,
    catalogStore: catalog,
    adminOrigin: "http://admin.test",
    secureCookies: false,
    trustProxy: false,
    sendEmail: async () => {},
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const addr = server.address();
  assert.ok(addr && typeof addr !== "string");
  const base = `http://127.0.0.1:${addr.port}`;
  const login = await fetch(base + "/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "http://admin.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: "catalog@example.test", password }),
  });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  return {
    auth,
    id,
    catalog,
    close: async () => {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    },
    request: (
      path: string,
      method = "GET",
      body?: unknown,
      origin = "http://admin.test",
      session = cookie,
    ) =>
      fetch(base + "/api/admin/catalog" + path, {
        method,
        headers: {
          Cookie: session,
          Origin: origin,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
  };
}
const inputs = {
  clients: { name: "Private client" },
  contributors: { name: "Designer" },
  skills: { name: "TypeScript", slug: "typescript", category: "Frontend" },
  reviews: { body: "Very thoughtful work.", rating: 4.99 },
};
for (const kind of catalogKinds)
  test(`${kind}: create, list, update, stale-write rejection`, async () => {
    const f = await fixture();
    try {
      let r = await f.request("/" + kind, "POST", inputs[kind]);
      assert.equal(r.status, 201);
      let { record } = await r.json();
      assert.equal(
        (await f.request("/" + kind + "?limit=20&offset=0")).status,
        200,
      );
      assert.equal((await f.request(`/${kind}/${record.id}`)).status, 200);
      const input = catalogInputs[kind].parse(inputs[kind]);
      r = await f.request(`/${kind}/${record.id}`, "PUT", {
        record: input,
        expectedUpdatedAt: record.updatedAt,
      });
      assert.equal(r.status, 200);
      assert.equal(
        (
          await f.request(`/${kind}/${record.id}`, "PUT", {
            record: input,
            expectedUpdatedAt: record.updatedAt,
          })
        ).status,
        409,
      );
      record = (await r.json()).record;
      if (kind !== "skills") {
        r = await f.request(`/${kind}/${record.id}/state`, "POST", {
          state: "archived",
          expectedUpdatedAt: record.updatedAt,
        });
        assert.equal(r.status, 200);
        record = (await r.json()).record;
        assert.equal(
          (
            await f.request(`/${kind}/${record.id}/state`, "POST", {
              state: kind === "reviews" ? "draft" : "active",
              expectedUpdatedAt: record.updatedAt,
            })
          ).status,
          200,
        );
      } else
        assert.equal(
          (
            await f.request(`/${kind}/${record.id}/state`, "POST", {
              state: "archived",
              expectedUpdatedAt: record.updatedAt,
            })
          ).status,
          400,
        );
    } finally {
      await f.close();
    }
  });
test("catalog auth, origin, input limits, and unknown endpoints", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.request("/clients", "GET", undefined, "http://admin.test", ""))
        .status,
      401,
    );
    assert.equal(
      (await f.request("/clients", "POST", inputs.clients, "http://evil.test"))
        .status,
      403,
    );
    for (const path of [
      "/clients?limit=101",
      "/clients?limit=1&limit=2",
      "/clients/9007199254740992",
      "/clients/2147483648",
      "/options?projectId=2147483648",
      "/options?clientId=bad",
      "/clients?unknown=x",
    ]) {
      assert.equal((await f.request(path)).status, 400, path);
    }
    assert.equal((await f.request("/nope")).status, 404);
    for (const kind of catalogKinds) {
      assert.equal(
        (
          await f.request("/" + kind, "POST", {
            ...inputs[kind],
            publicationStatus: "published",
          })
        ).status,
        400,
      );
    }
    assert.equal(
      (await f.request("/reviews", "POST", { showIdentity: true })).status,
      400,
    );
    assert.equal(
      (await f.request("/reviews", "POST", { rating: 5.01 })).status,
      400,
    );
    assert.equal(
      (
        await f.request("/skills", "POST", {
          ...inputs.skills,
          iconUrl: "javascript:alert(1)",
        })
      ).status,
      400,
    );
    f.auth.users.get(f.id)!.status = "disabled";
    assert.equal((await f.request("/clients")).status, 401);
  } finally {
    await f.close();
  }
});
test("editor creates and reads shared records but cannot overwrite or archive them", async () => {
  const f = await fixture("editor");
  try {
    for (const kind of catalogKinds) {
      const r = await f.request("/" + kind, "POST", inputs[kind]);
      assert.equal(r.status, 201);
      const { record } = await r.json();
      assert.equal(
        (
          await f.request(`/${kind}/${record.id}`, "PUT", {
            record: catalogInputs[kind].parse(inputs[kind]),
            expectedUpdatedAt: record.updatedAt,
          })
        ).status,
        kind === "reviews" ? 200 : 403,
      );
      assert.equal(
        (
          await f.request(`/${kind}/${record.id}/state`, "POST", {
            state: "archived",
            expectedUpdatedAt: record.updatedAt,
          })
        ).status,
        403,
      );
    }
  } finally {
    await f.close();
  }
});
test("review relationships, independent anonymous identity, duplicate sources, and draft-only state", async () => {
  const f = await fixture();
  try {
    const client = (
      await (await f.request("/clients", "POST", inputs.clients)).json()
    ).record;
    f.catalog.projects.set(1, {
      id: 1,
      title: "Client product",
      clientId: client.id,
    });
    assert.equal(
      (await f.request("/reviews", "POST", { clientId: 99, projectId: 1 }))
        .status,
      400,
    );
    assert.equal(
      (
        await f.request("/reviews", "POST", {
          clientId: client.id,
          projectId: 99,
        })
      ).status,
      400,
    );
    const r = await f.request("/reviews", "POST", {
      clientId: client.id,
      projectId: 1,
      body: "Thank you",
      externalId: "review-1",
    });
    assert.equal(r.status, 201);
    const { record } = await r.json();
    assert.equal(record.showIdentity, false);
    assert.equal(record.publicationStatus, "draft");
    assert.equal(
      (await f.request("/reviews", "POST", { externalId: "review-1" })).status,
      409,
    );
    assert.equal(
      (
        await f.request(`/reviews/${record.id}/state`, "POST", {
          state: "published",
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      400,
    );
    const options = await (await f.request("/options?q=Client")).json();
    assert.equal(options.clients.length, 1);
    assert.equal(options.projects.length, 1);
  } finally {
    await f.close();
  }
});
test("linked skill names and slugs are protected", async () => {
  const f = await fixture();
  try {
    const { record } = await (
      await f.request("/skills", "POST", inputs.skills)
    ).json();
    f.catalog.linkedSkills.add(record.id);
    assert.equal(
      (
        await f.request(`/skills/${record.id}`, "PUT", {
          record: { ...inputs.skills, name: "New name" },
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await f.request(`/skills/${record.id}`, "PUT", {
          record: { ...inputs.skills, category: "Languages" },
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      200,
    );
  } finally {
    await f.close();
  }
});
test("catalog SQL uses atomic live authorization, version locks, and audits", () => {
  for (const kind of catalogKinds) {
    for (const create of [true, false]) {
      const sql = catalogSaveSql(kind, create);
      assert.match(sql, /auth_version=\$2::int/);
      assert.match(sql, /FOR SHARE/);
      assert.match(sql, /FOR UPDATE/);
      assert.match(sql, /admin_audit_logs/);
      assert.match(sql, /\$3::jsonb/);
      if (!create) assert.match(sql, /updated_at.*\$5::timestamp/);
    }
    if (kind !== "skills")
      assert.match(catalogStateSql(kind), /role IN \('owner','admin'\)/);
  }
  assert.match(catalogSaveSql("reviews", false), /publication_status.*draft/);
});
