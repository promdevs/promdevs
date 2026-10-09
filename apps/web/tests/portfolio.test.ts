import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allProjects,
  featuredProjects,
  featuredWorkProjects,
  portfolioPage,
  projectBySlug,
  selectedPortfolio,
} from "../lib/portfolio-data";
import { getWorkCountries } from "../data/countries";
import land from "../data/globe-points.json";

const project = (id: number) => ({
  id,
  title: `Product ${id}`,
  slug: `product-${id}`,
  description: "A published product",
  category: "",
  year: null,
  productTypes: ["web_app"],
  platforms: ["web"],
  coverImage: "/cover.png",
  coverAlt: "Product interface",
  featured: false,
  publishedAt: "2026-10-08T10:00:00Z",
});
const page = (
  resource: string,
  rows: unknown[],
  total: number,
  limit: number,
  offset = 0,
) => Response.json({ [resource]: rows, total, limit, offset });

test("retrieves the complete catalog across API pages, using uncached public requests", async () => {
  const calls: number[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/api/portfolio/projects");
    assert.equal(options?.cache, "no-store");
    const offset = Number(url.searchParams.get("offset"));
    calls.push(offset);
    return page(
      "projects",
      Array.from({ length: Math.min(100, 205 - offset) }, (_, i) =>
        project(offset + i + 1),
      ),
      205,
      100,
      offset,
    );
  };
  const rows = await allProjects("https://api.example.test", fetcher);
  assert.equal(rows.length, 205);
  assert.deepEqual(calls, [0, 100, 200]);
  assert.equal(rows[204].id, 205);
});

test("selection preserves featured API ordering without filling with nonfeatured projects", async () => {
  let calls = 0;
  const rows = await selectedPortfolio(
    "https://api.example.test",
    "projects",
    4,
    async (input) => {
      calls++;
      assert.equal(new URL(String(input)).searchParams.get("featured"), "true");
      return page("projects", [project(7), project(2)], 2, 4);
    },
  );
  assert.deepEqual(
    rows.map((p) => p.id),
    [7, 2],
  );
  assert.equal(calls, 1);
});

test("empty featured selection falls back to ordered published content", async () => {
  const rows = await selectedPortfolio(
    "https://api.example.test",
    "projects",
    4,
    async (input) =>
      new URL(String(input)).searchParams.has("featured")
        ? page("projects", [], 0, 4)
        : page("projects", [project(3)], 1, 4),
  );
  assert.equal(rows[0].id, 3);
});

test("empty catalogs remain empty, never receive demo projects", async () => {
  assert.deepEqual(
    await allProjects("https://api.example.test", async () =>
      page("projects", [], 0, 100),
    ),
    [],
  );
});

test("featured work retrieves every page in API order without a four-project cap", async () => {
  const calls: number[] = [];
  const rows = await featuredProjects(
    "https://api.example.test",
    async (input, options) => {
      const url = new URL(String(input));
      assert.equal(url.searchParams.get("featured"), "true");
      assert.equal(options?.cache, "no-store");
      const offset = Number(url.searchParams.get("offset"));
      calls.push(offset);
      return page(
        "projects",
        Array.from({ length: Math.min(100, 107 - offset) }, (_, index) => ({
          ...project(107 - offset - index),
          featured: true,
        })),
        107,
        100,
        offset,
      );
    },
  );
  assert.deepEqual(calls, [0, 100]);
  assert.equal(rows.length, 107);
  assert.deepEqual(
    rows.map((row) => row.id),
    Array.from({ length: 107 }, (_, index) => 107 - index),
  );
});

test("empty featured work never falls back to nonfeatured projects", async () => {
  let calls = 0;
  const rows = await featuredProjects(
    "https://api.example.test",
    async (input) => {
      calls++;
      assert.equal(new URL(String(input)).searchParams.get("featured"), "true");
      return page("projects", [], 0, 100);
    },
  );
  assert.deepEqual(rows, []);
  assert.equal(calls, 1);
});

test("featured cards receive services from validated public details without changing order", async () => {
  const summary = (id: number) => ({ ...project(id), featured: true });
  const rows = await featuredWorkProjects(
    "https://api.example.test",
    async (input, options) => {
      const url = new URL(String(input));
      assert.equal(options?.cache, "no-store");
      if (url.pathname === "/api/portfolio/projects")
        return page("projects", [summary(7), summary(2), summary(3)], 3, 100);
      const id = Number(url.pathname.split("-").at(-1));
      if (id === 3) return new Response(null, { status: 404 });
      return Response.json({
        project: {
          ...summary(id),
          status: "completed",
          roleSummary: null,
          services: ["Product design", "Web development"],
          builtWith: [],
          tags: [],
          problem: null,
          approach: null,
          solution: null,
          results: null,
          gallery: [],
          liveUrl: null,
          appStoreUrl: null,
          playStoreUrl: null,
          githubUrl: null,
          seoTitle: null,
          seoDescription: null,
          socialImage: null,
          duration: null,
          client: null,
          skills: [],
        },
      });
    },
  );
  assert.deepEqual(
    rows.map((row) => row.id),
    [7, 2],
  );
  assert.deepEqual(rows[0].services, ["Product design", "Web development"]);
});

test("featured selection fails on outages and stalled pagination instead of returning partial work", async () => {
  await assert.rejects(
    () =>
      featuredProjects(
        "https://api.example.test",
        async () => new Response(null, { status: 503 }),
      ),
    /unavailable/,
  );
  await assert.rejects(
    () =>
      featuredProjects("https://api.example.test", async () =>
        page("projects", [], 101, 100),
      ),
    /complete catalog/,
  );
});

test("invalid pagination, stalled catalogs, and malformed records fail rather than silently truncate", async () => {
  await assert.rejects(
    () =>
      allProjects("https://api.example.test", async () =>
        page("projects", [], 150, 100),
      ),
    /complete catalog/,
  );
  await assert.rejects(
    () =>
      portfolioPage("https://api.example.test", "projects", {}, async () =>
        page("projects", [], -1, 100),
      ),
    /pagination/,
  );
  await assert.rejects(() =>
    portfolioPage("https://api.example.test", "projects", {}, async () =>
      page("projects", [{ id: 1 }], 1, 100),
    ),
  );
});

test("anonymous reviews and optional title/rating remain null, and private fields are discarded", async () => {
  const rows = await selectedPortfolio(
    "https://api.example.test",
    "reviews",
    6,
    async () =>
      page(
        "reviews",
        [
          {
            id: 1,
            title: null,
            rating: null,
            body: "A genuine quote",
            author: null,
            reviewedAt: null,
            source: "direct",
            sourceUrl: null,
            featured: true,
            projectSlug: null,
            internalNotes: "private",
            clientId: 9,
          },
        ],
        1,
        6,
      ),
  );
  assert.equal("author" in rows[0] && rows[0].author, null);
  assert.equal("internalNotes" in rows[0], false);
  assert.equal("clientId" in rows[0], false);
});

test("project detail uses published routes, distinguishes 404 from outage, and escapes slugs", async () => {
  assert.equal(
    await projectBySlug(
      "https://api.example.test",
      "hidden",
      async () => new Response(null, { status: 404 }),
    ),
    null,
  );
  await assert.rejects(
    () =>
      projectBySlug(
        "https://api.example.test",
        "product",
        async () => new Response(null, { status: 503 }),
      ),
    /temporarily unavailable/,
  );
  await projectBySlug(
    "https://api.example.test",
    "test/value",
    async (input) => {
      assert.equal(
        new URL(String(input)).pathname,
        "/api/portfolio/projects/test%2Fvalue",
      );
      return new Response(null, { status: 404 });
    },
  );
});

test("no unverified country claims appear in any environment", () => {
  const env: Record<string, string | undefined> = process.env;
  const original = env.NODE_ENV;
  try {
    env.NODE_ENV = "production";
    assert.deepEqual(getWorkCountries(), []);
    env.NODE_ENV = "test";
    assert.deepEqual(getWorkCountries(), []);
    env.NODE_ENV = "development";
    assert.deepEqual(getWorkCountries(), []);
  } finally {
    if (original === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = original;
  }
});

test("local geography is bounded spherical land geometry", () => {
  assert.ok(land.length > 5000 && land.length < 10000);
  for (const point of land) {
    assert.equal(point.length, 3);
    assert.ok(
      point.every((value) => Number.isFinite(value) && Math.abs(value) <= 1),
    );
    assert.ok(Math.abs(Math.hypot(...point) - 1) < 0.001);
  }
});
