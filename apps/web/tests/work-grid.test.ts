import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelectedWorkGrid } from "../components/SelectedWorkGrid";
import type { FeaturedWorkProject } from "../lib/portfolio-data";
import { workServiceLabel } from "../lib/work-service-label";

const project = (id: number): FeaturedWorkProject => ({
  id,
  title: `Featured product ${id}`,
  slug: `featured-product-${id}`,
  description: `Design and engineering for product ${id}.`,
  category: "",
  year: null,
  productTypes: ["web_app"],
  platforms: ["web"],
  coverImage: "/cover.png",
  coverAlt: `Product ${id} interface`,
  featured: true,
  publishedAt: "2026-10-08T10:00:00Z",
  services: ["product_design", "frontend_development", "qa_performance"],
});
const render = (projects: FeaturedWorkProject[]) =>
  renderToStaticMarkup(createElement(SelectedWorkGrid, { projects }));

test("empty work does not render a grid or a directory link", () => {
  assert.equal(render([]), "");
});

test("all featured projects retain API order and usable server-rendered links", () => {
  const projects = [9, 3, 7, 2, 8, 1, 6].map(project);
  const html = render(projects);
  assert.equal((html.match(/<article/g) ?? []).length, projects.length);
  let lastPosition = -1;
  for (const item of projects) {
    const position = html.indexOf(`href="/projects/${item.slug}"`);
    assert.ok(position > lastPosition);
    lastPosition = position;
    assert.ok(html.includes(`id="work-project-${item.id}"`));
    assert.ok(html.includes(`<h3 id="work-project-${item.id}"><a`));
    assert.ok(html.includes(item.title));
    assert.ok(html.includes(item.description));
    assert.ok(html.includes(`alt="${item.coverAlt}"`));
  }
  assert.ok(html.includes('href="/projects"'));
  assert.ok(!html.includes("work-rail"));
  assert.ok(!html.includes("<button"));
  assert.ok(!html.includes('tabindex="-1"'));
});

test("one project, missing optional details, and unavailable covers stay readable", () => {
  const item = {
    ...project(1),
    coverImage: "",
    services: [],
    productTypes: [],
  };
  const html = render([item]);
  assert.equal((html.match(/<article/g) ?? []).length, 1);
  assert.ok(html.includes("Preview unavailable"));
  assert.ok(html.includes(item.title));
  assert.ok(html.includes('href="/projects/featured-product-1"'));
  assert.ok(!html.includes("Services provided"));
});

test("service labels remain available for detail consumers", () => {
  assert.equal(workServiceLabel("product_design"), "Product design");
  assert.equal(
    workServiceLabel("frontend_development"),
    "Frontend development",
  );
  assert.equal(workServiceLabel("qa_performance"), "QA & performance");
  assert.equal(workServiceLabel("ai_development"), "AI development");
  assert.equal(workServiceLabel("Custom service"), "Custom service");
});

test("long client content is escaped safely rather than interpreted as markup", () => {
  const html = render([
    { ...project(1), title: '<script>alert("x")</script>' },
  ]);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
});

test("compact tiles omit article-style footers, service lists and year rows", () => {
  const html = render([{ ...project(1), year: 2026 }]);
  assert.ok(html.includes('class="work-grid-title-row"'));
  assert.ok(html.includes('class="work-grid-arrow"'));
  assert.ok(!html.includes("work-grid-bottom"));
  assert.ok(!html.includes("Services provided"));
  assert.ok(!html.includes("View project"));
  assert.ok(!html.includes("work-grid-year"));
  assert.equal(
    (html.match(/href="\/projects\/featured-product-1"/g) ?? []).length,
    1,
  );
});

test("each tile has a decorative border path without additional links or controls", () => {
  const html = render([project(1), project(2)]);
  assert.equal((html.match(/class="work-grid-outline"/g) ?? []).length, 2);
  assert.equal((html.match(/pathLength="100"/g) ?? []).length, 2);
  assert.ok(
    html.includes(
      'class="work-grid-outline" aria-hidden="true" focusable="false"',
    ),
  );
  assert.equal((html.match(/class="work-grid-title-link"/g) ?? []).length, 2);
  assert.ok(!html.includes("<button"));
});
