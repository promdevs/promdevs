import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import {
  catalogInputs,
  draftProjectInputSchema,
  projectPublicationIssues,
  reviewPublicationIssues,
} from "@promdevs/contracts";
import { createApiServer } from "../src/server.js";
import { hashPassword } from "../src/auth.js";
import { MemoryAuth, MemoryProjects } from "./fixtures.js";
import { MemoryPortfolio } from "./portfolio-fixtures.js";
import { MemoryCatalog } from "./catalog-fixtures.js";
import { MemoryPublicPortfolio } from "./public-portfolio-fixtures.js";
import { portfolioStateSql } from "../src/portfolio.js";
import { catalogStateSql } from "../src/catalog.js";
import {
  publicProjectsSql,
  publicProjectSql,
  publicReviewsSql,
} from "../src/public-portfolio.js";

const readyProject = {
  title: "A real product",
  slug: "real-product",
  description: "A clear product description.",
  productTypes: ["web_app"],
  coverImage: "https://media.example.test/cover.png",
  coverAlt: "Product overview",
};
async function fixture(role: "owner" | "admin" | "editor" = "owner") {
  const auth = new MemoryAuth(),
    id = randomUUID();
  auth.users.set(id, {
    id,
    email: "publisher@example.test",
    role,
    status: "active",
    authVersion: 1,
    passwordHash: await hashPassword("test publishing password"),
  });
  const actor = auth.users.get(id)!,
    portfolio = new MemoryPortfolio(auth),
    catalog = new MemoryCatalog(auth);
  const client = await catalog.save(
    actor,
    "clients",
    catalogInputs.clients.parse({
      name: "PRIVATE INTERNAL NAME",
      publicName: "Public Studio",
      contactEmail: "secret@example.test",
      contactPhone: "PRIVATE PHONE",
      notes: "PRIVATE NOTES",
    }),
  );
  portfolio.catalog.clients.push({
    id: client.id,
    name: "PRIVATE INTERNAL NAME",
    clientType: "organization",
    publicName: "Public Studio",
    status: "active",
  });
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: auth,
    portfolioStore: portfolio,
    catalogStore: catalog,
    publicPortfolioStore: new MemoryPublicPortfolio(portfolio, catalog),
    adminOrigin: "http://admin.test",
    secureCookies: false,
    trustProxy: false,
    sendEmail: async () => {},
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
      email: actor.email,
      password: "test publishing password",
    }),
  });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  return {
    id,
    auth,
    portfolio,
    catalog,
    client,
    request: (
      path: string,
      method = "GET",
      body?: unknown,
      origin = "http://admin.test",
      session = cookie,
    ) =>
      fetch(base + path, {
        method,
        headers: {
          Cookie: session,
          Origin: origin,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    close: async () => {
      server.close();
      server.closeAllConnections();
      await once(server, "close");
    },
  };
}
const projectPath = "/api/admin/portfolio/projects",
  reviewPath = "/api/admin/catalog/reviews";
test("publication checks require meaningful content, not a review title or rating", () => {
  assert.deepEqual(
    projectPublicationIssues(draftProjectInputSchema.parse({ title: "Draft" })),
    [
      "URL slug",
      "Description",
      "Product type",
      "Cover image",
      "Cover image alt text",
    ],
  );
  assert.deepEqual(reviewPublicationIssues(catalogInputs.reviews.parse({})), [
    "Linked client",
    "Review body",
  ]);
  assert.deepEqual(
    reviewPublicationIssues(
      catalogInputs.reviews.parse({ clientId: 1, body: "Thanks" }),
    ),
    [],
  );
});
for (const role of ["owner", "admin"] as const)
  test(`${role} can publish and unpublish projects; stale writes and published edits are blocked`, async () => {
    const f = await fixture(role);
    try {
      let response = await f.request(projectPath, "POST", {
        ...readyProject,
        clientId: f.client.id,
        showClient: true,
        timeline: {
          start_date: "2026-01-01",
          end_date: "2026-02-26",
          milestones: [
            {
              label: "PRIVATE MILESTONE",
              date: "2026-01-15",
            },
          ],
        },
      });
      assert.equal(response.status, 201);
      let { project } = await response.json();
      const firstVersion = project.updatedAt;
      assert.equal(
        (await f.request("/api/portfolio/projects", "GET", undefined, "", ""))
          .status,
        200,
      );
      assert.equal(
        (await (await f.request("/api/portfolio/projects")).json()).total,
        0,
      );
      response = await f.request(`${projectPath}/${project.id}/state`, "POST", {
        state: "published",
        expectedUpdatedAt: project.updatedAt,
      });
      assert.equal(response.status, 200);
      project = (await response.json()).project;
      assert.equal(project.publicationStatus, "published");
      assert.ok(project.publishedAt);
      const publicDetail = await (
        await f.request("/api/portfolio/projects/real-product")
      ).json();
      assert.equal(publicDetail.project.client.name, "Public Studio");
      assert.equal(publicDetail.project.duration, "8 weeks");
      for (const secret of [
        "PRIVATE INTERNAL NAME",
        "PRIVATE PHONE",
        "PRIVATE NOTES",
        "secret@example.test",
        "PRIVATE MILESTONE",
        "PRIVATE DETAIL",
        "timeline",
        "clientId",
        "contributors",
      ])
        assert.ok(!JSON.stringify(publicDetail).includes(secret));
      assert.equal(
        (
          await f.request(`${projectPath}/${project.id}`, "PUT", {
            project: draftProjectInputSchema.parse(readyProject),
            expectedUpdatedAt: project.updatedAt,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await f.request(`${projectPath}/${project.id}/state`, "POST", {
            state: "draft",
            expectedUpdatedAt: firstVersion,
          })
        ).status,
        409,
      );
      response = await f.request(`${projectPath}/${project.id}/state`, "POST", {
        state: "draft",
        expectedUpdatedAt: project.updatedAt,
      });
      assert.equal(response.status, 200);
      project = (await response.json()).project;
      assert.equal(project.publishedAt, null);
      assert.equal(
        (await f.request("/api/portfolio/projects/real-product")).status,
        404,
      );
      assert.equal(
        (await (await f.request("/api/portfolio/projects")).json()).total,
        0,
      );
      assert.ok(f.portfolio.audits.includes("project.published"));
      assert.ok(f.portfolio.audits.includes("project.unpublished"));
      assert.equal(
        (
          await f.request(`${projectPath}/${project.id}`, "PUT", {
            project: draftProjectInputSchema.parse(readyProject),
            expectedUpdatedAt: project.updatedAt,
          })
        ).status,
        200,
      );
    } finally {
      await f.close();
    }
  });
test("reviews publish without titles, hide all identity fields, and can be unpublished", async () => {
  const f = await fixture();
  try {
    let response = await f.request(reviewPath, "POST", {
      clientId: f.client.id,
      body: "Very thoughtful work.",
      authorName: "PRIVATE AUTHOR",
      authorCompany: "PRIVATE COMPANY",
      authorRole: "PRIVATE ROLE",
      authorAvatar: "https://media.example.test/private-avatar.png",
      internalNotes: "PRIVATE REVIEW NOTES",
    });
    assert.equal(response.status, 201);
    let { record } = await response.json();
    response = await f.request(`${reviewPath}/${record.id}/state`, "POST", {
      state: "published",
      expectedUpdatedAt: record.updatedAt,
    });
    assert.equal(response.status, 200);
    record = (await response.json()).record;
    assert.ok(record.publishedAt);
    assert.equal(record.title, null);
    let publicData = await (await f.request("/api/portfolio/reviews")).json();
    assert.equal(publicData.total, 1);
    assert.equal(publicData.reviews[0].author, null);
    for (const secret of [
      "PRIVATE",
      "clientId",
      "internalNotes",
      "private-avatar",
    ])
      assert.ok(!JSON.stringify(publicData).includes(secret));
    assert.equal(
      (
        await f.request(`${reviewPath}/${record.id}`, "PUT", {
          record: catalogInputs.reviews.parse({
            clientId: f.client.id,
            body: "Changed",
          }),
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      409,
    );
    response = await f.request(`${reviewPath}/${record.id}/state`, "POST", {
      state: "draft",
      expectedUpdatedAt: record.updatedAt,
    });
    assert.equal(response.status, 200);
    record = (await response.json()).record;
    assert.equal(record.publishedAt, null);
    assert.equal(
      (await (await f.request("/api/portfolio/reviews")).json()).total,
      0,
    );
    response = await f.request(`${reviewPath}/${record.id}`, "PUT", {
      record: catalogInputs.reviews.parse({
        clientId: f.client.id,
        body: "Very thoughtful work.",
        authorName: "Jane Public",
        authorCompany: "Public Company",
        showIdentity: true,
      }),
      expectedUpdatedAt: record.updatedAt,
    });
    assert.equal(response.status, 200);
    record = (await response.json()).record;
    assert.equal(
      (
        await f.request(`${reviewPath}/${record.id}/state`, "POST", {
          state: "published",
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      200,
    );
    publicData = await (await f.request("/api/portfolio/reviews")).json();
    assert.equal(publicData.reviews[0].author.name, "Jane Public");
    assert.equal(publicData.reviews[0].author.company, "Public Company");
    assert.ok(f.catalog.audits.includes("review.published"));
    assert.ok(f.catalog.audits.includes("review.unpublished"));
  } finally {
    await f.close();
  }
});
test("publish requires authentication, owner/admin privileges, same origin, current version, and complete content", async () => {
  const f = await fixture();
  try {
    let response = await f.request(projectPath, "POST", {
      title: "Incomplete",
    });
    const { project } = await response.json();
    const body = { state: "published", expectedUpdatedAt: project.updatedAt },
      path = `${projectPath}/${project.id}/state`;
    assert.equal(
      (await f.request(path, "POST", body, "http://admin.test", "")).status,
      401,
    );
    assert.equal(
      (await f.request(path, "POST", body, "http://evil.test")).status,
      403,
    );
    assert.equal((await f.request(path, "POST", body, "")).status, 403);
    response = await f.request(path, "POST", body);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Cover image alt text/);
    assert.equal(
      (await f.request(path, "POST", { ...body, publishedAt: "injected" }))
        .status,
      400,
    );
    assert.equal(
      (
        await f.request(path, "POST", {
          state: "published",
          expectedUpdatedAt: "2020-01-01T00:00:00Z",
        })
      ).status,
      409,
    );
    assert.equal(f.portfolio.rows.get(project.id)!.publicationStatus, "draft");
    assert.ok(!f.portfolio.audits.includes("project.published"));
    let r = await f.request(reviewPath, "POST", {});
    const record = (await r.json()).record;
    r = await f.request(`${reviewPath}/${record.id}/state`, "POST", {
      state: "published",
      expectedUpdatedAt: record.updatedAt,
    });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /Linked client/);
    f.auth.users.get(f.id)!.role = "editor";
    assert.equal((await f.request(path, "POST", body)).status, 403);
    assert.equal(
      (
        await f.request(`${reviewPath}/${record.id}/state`, "POST", {
          state: "published",
          expectedUpdatedAt: record.updatedAt,
        })
      ).status,
      403,
    );
    f.auth.users.get(f.id)!.authVersion++;
    assert.equal((await f.request(path, "POST", body)).status, 401);
  } finally {
    await f.close();
  }
});
test("archived records must be restored first; published records must be unpublished before archiving", async () => {
  const f = await fixture();
  try {
    for (const path of [projectPath, reviewPath]) {
      let response = await f.request(
        path,
        "POST",
        path === projectPath
          ? readyProject
          : { clientId: f.client.id, body: "A review" },
      );
      assert.equal(response.status, 201);
      const key = path === projectPath ? "project" : "record";
      let record = (await response.json())[key];
      for (const state of [
        "archived",
        "published",
        "draft",
        "published",
        "archived",
        "published",
        "draft",
      ] as const) {
        response = await f.request(`${path}/${record.id}/state`, "POST", {
          state,
          expectedUpdatedAt: record.updatedAt,
        });
        const rejected =
          (state === "published" && record.publicationStatus !== "draft") ||
          (state === "archived" && record.publicationStatus !== "draft");
        assert.equal(response.status, rejected ? 409 : 200);
        if (!rejected) record = (await response.json())[key];
      }
    }
  } finally {
    await f.close();
  }
});
test("publication SQL locks versions, validates saved content, and audits atomically; public SQL gates publication and identity", () => {
  for (const sql of [portfolioStateSql, catalogStateSql("reviews")]) {
    for (const pattern of [
      /FOR UPDATE/,
      /FOR SHARE/,
      /auth_version=\$2/,
      /role IN \('owner','admin'\)/,
      /missing FROM readiness/,
      /published_at=CASE/,
      /INSERT INTO admin_audit_logs/,
      /unpublished/,
    ])
      assert.match(sql, pattern);
  }
  assert.match(publicProjectsSql, /publication_status='published'/);
  assert.match(publicProjectSql, /publication_status='published'/);
  assert.match(publicProjectSql, /CASE WHEN p.show_client/);
  assert.match(publicProjectSql, /c.public_name/);
  assert.doesNotMatch(
    publicProjectSql,
    /contact_email|contact_phone|c\.name|project_contributors/,
  );
  assert.match(publicReviewsSql, /CASE WHEN r.show_identity/);
  assert.doesNotMatch(
    publicReviewsSql,
    /internal_notes|author_email|contact_email/,
  );
});
