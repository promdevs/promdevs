import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicProject } from "@promdevs/contracts";
import { ExpertisePage } from "../components/ExpertisePage";
import {
  expertiseKeys,
  expertisePages,
  getExpertisePage,
} from "../data/expertise";
import { expertiseNavigation } from "../data/expertise-navigation";
import { projectsForPlatform } from "../lib/portfolio-data";

const project = (id: number, builtWith: string[] = []): PublicProject => ({
  id,
  title: `Product ${id}`,
  slug: `product-${id}`,
  description: "An existing product, redesigned and rebuilt.",
  category: "",
  year: null,
  productTypes: ["web_app"],
  platforms: ["web"],
  coverImage: "/cover.png",
  coverAlt: "Product interface",
  featured: false,
  publishedAt: "2026-10-08T10:00:00Z",
  status: "completed",
  roleSummary: null,
  services: [],
  builtWith,
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
});
const render = (
  key: (typeof expertiseKeys)[number],
  projects: PublicProject[] = [],
) =>
  renderToStaticMarkup(
    createElement(ExpertisePage, {
      platform: key,
      page: expertisePages[key],
      projects,
    }),
  );

test("expertise pages have distinct, complete server-rendered content and only confirmed certifications", async () => {
  assert.deepEqual(expertiseKeys, ["replit", "lovable", "base44"]);
  assert.equal(
    new Set(expertiseKeys.map((key) => expertisePages[key].headline)).size,
    3,
  );
  for (const key of expertiseKeys) {
    const data = expertisePages[key];
    const html = render(key);
    await access(new URL(`../public${data.logo}`, import.meta.url));
    assert.equal(getExpertisePage(key), data);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.ok(
      html.indexOf("</h1>") < html.indexOf('class="expertise-description"'),
    );
    assert.ok(html.includes(data.headline));
    assert.ok(html.includes(data.emphasis));
    assert.equal((html.match(/<details>/g) ?? []).length, 5);
    for (const service of data.services) {
      assert.ok(html.includes(`href="#expertise-${service.id}"`));
      assert.ok(html.includes(`id="expertise-${service.id}"`));
      assert.equal(service.deliverables.length, 3);
    }
    assert.ok(html.includes('href="/?view=html#contact"'));
    assert.ok(html.includes('href="/client-stories"'));
    assert.equal(
      html.includes(`Certified ${data.name} expert`),
      key !== "base44",
    );
    assert.ok(!html.includes('id="expertise-work-title"'));
    assert.ok(!html.includes('class="case-feedback"'));
    assert.ok(!html.includes("100+"));
    assert.ok(!html.includes("</canvas>"));
    const script = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    assert.ok(script);
    const graph = JSON.parse(script[1])["@graph"];
    const service = graph.find(
      (item: { "@type": string }) => item["@type"] === "Service",
    );
    assert.equal(service.url, `https://www.promdevs.com/expertise/${key}`);
    assert.ok(!("aggregateRating" in service));
    assert.ok(!("offers" in service));
    const breadcrumbs = graph.find(
      (item: { "@type": string }) => item["@type"] === "BreadcrumbList",
    );
    assert.equal(breadcrumbs.itemListElement.length, 2);
    assert.equal(breadcrumbs.itemListElement[1].item, service.url);
  }
  for (const key of [
    "unknown",
    "__proto__",
    "constructor",
    "toString",
    "REPLIT",
  ]) {
    assert.equal(getExpertisePage(key), null);
  }
});

test("work on expertise pages comes from supplied published records, stays compact, and is not name-specific", () => {
  const projects = Array.from({ length: 7 }, (_, index) =>
    project(index + 1, ["replit"]),
  );
  const html = render("replit", projects);
  assert.ok(html.includes('id="expertise-work-title"'));
  assert.equal((html.match(/class="catalog-card"/g) ?? []).length, 3);
  for (const item of projects.slice(0, 3))
    assert.ok(html.includes(`href="/projects/${item.slug}"`));
  assert.ok(!html.includes('href="/projects/product-4"'));
  assert.ok(html.includes('href="/projects"'));
  assert.equal((html.match(/loading="lazy"/g) ?? []).length, 4);
});

test("platform work uses validated builtWith values only, preserves API order and skips unpublished records", async () => {
  const records = [
    project(4, ["Replit"]),
    { ...project(2), title: "Replit app", tags: ["replit"] },
    project(8, [" REPLIT "]),
    project(6, ["replit"]),
  ];
  const calls: string[] = [];
  let active = 0;
  let peak = 0;
  const result = await projectsForPlatform(
    "https://api.example.test",
    "replit",
    async (input, options) => {
      assert.equal(options?.cache, "no-store");
      const url = new URL(String(input));
      calls.push(url.pathname);
      if (url.pathname === "/api/portfolio/projects") {
        assert.equal(url.searchParams.has("featured"), false);
        return Response.json({
          projects: records,
          limit: 100,
          offset: 0,
          total: records.length,
        });
      }
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      const record = records.find(({ slug }) =>
        url.pathname.endsWith(`/${slug}`),
      );
      if (record?.id === 6) return new Response(null, { status: 404 });
      return Response.json({
        project: { ...record, internalNotes: "must not escape" },
      });
    },
  );
  assert.deepEqual(
    result.map(({ id }) => id),
    [4, 8],
  );
  assert.equal(peak, 4);
  assert.equal(calls.length, 5);
  assert.equal("internalNotes" in result[0], false);
});

test("platform work traverses the published catalog and bounds detail requests to four at once", async () => {
  const records = Array.from({ length: 103 }, (_, index) =>
    project(index + 1, index % 20 ? [] : ["lovable"]),
  );
  const offsets: number[] = [];
  let active = 0;
  let peak = 0;
  const result = await projectsForPlatform(
    "https://api.example.test",
    "lovable",
    async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/portfolio/projects") {
        const offset = Number(url.searchParams.get("offset"));
        offsets.push(offset);
        return Response.json({
          projects: records.slice(offset, offset + 100),
          limit: 100,
          offset,
          total: records.length,
        });
      }
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      const record = records.find(({ slug }) =>
        url.pathname.endsWith(`/${slug}`),
      );
      return Response.json({ project: record });
    },
  );
  assert.deepEqual(offsets, [0, 100]);
  assert.deepEqual(
    result.map(({ id }) => id),
    [1, 21, 41, 61, 81, 101],
  );
  assert.equal(peak, 4);
});

test("platform work logs and omits failed details without falling back to unrelated work", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const records = [project(1), project(2)];
  const result = await projectsForPlatform(
    "https://api.example.test",
    "base44",
    async (input) => {
      const url = new URL(String(input));
      return url.pathname.endsWith("/projects")
        ? Response.json({ projects: records, limit: 100, offset: 0, total: 2 })
        : url.pathname.endsWith("product-1")
          ? Response.json({ project: { id: 1 } })
          : new Response(null, { status: 503 });
    },
  );
  assert.deepEqual(result, []);
  assert.equal(log.mock.callCount(), 2);
  await assert.rejects(
    projectsForPlatform(
      "https://api.example.test",
      "replit",
      async () => new Response(null, { status: 503 }),
    ),
    /unavailable/,
  );
});

test("routes connect desktop, mobile, no-JS navigation and footer, and reviews require actual project relationships", async () => {
  const [header, footer, route, css] = await Promise.all([
    readFile(new URL("../components/Header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/Footer.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/expertise/[platform]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/expertise/expertise.css", import.meta.url),
      "utf8",
    ),
  ]);
  for (const { key, href } of expertiseNavigation)
    assert.equal(href, `/expertise/${key}`);
  assert.ok(header.includes("expertiseNavigation.map"));
  assert.ok(header.includes("<noscript>"));
  assert.ok(footer.includes("expertiseNavigation.map"));
  assert.ok(route.includes("if (!page) notFound()"));
  assert.ok(route.includes("slugs.has(projectSlug)"));
  assert.ok(route.includes("canonical: `/expertise/${platform}`"));
  assert.ok(route.includes('dynamic = "force-dynamic"'));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("@media (max-width: 419px)"));
});
