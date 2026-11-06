import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ServicesOverview } from "../components/ServicesOverview";
import { serviceAreas, servicesDescription } from "../data/services";
import { expertiseNavigation } from "../data/expertise-navigation";
import { expertisePages } from "../data/expertise";

const render = () => renderToStaticMarkup(createElement(ServicesOverview));

test("Services has one H1, a clear reading order, and five complete visible capabilities", () => {
  const html = render();
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.ok(html.includes("Great products."));
  assert.ok(html.includes("From every angle."));
  assert.ok(html.indexOf("</h1>") < html.indexOf('class="offerings-lead"'));
  assert.ok(html.includes("Product management, design, and engineering"));
  assert.ok(html.includes('href="/?view=html#contact"'));
  assert.ok(html.includes('href="/projects"'));
  assert.ok(html.includes('href="/client-stories"'));
  assert.equal(serviceAreas.length, 5);
  for (const service of serviceAreas) {
    assert.ok(html.includes(`href="#${service.id}"`));
    assert.ok(html.includes(`id="${service.id}"`));
    const heading = renderToStaticMarkup(
      createElement("h2", { id: `${service.id}-title` }, service.name),
    );
    assert.ok(html.includes(heading));
    assert.ok(html.indexOf(heading) < html.indexOf(service.introduction));
    assert.ok(html.includes(service.introduction));
    assert.equal(service.scope.length, 4);
    assert.equal(service.outputs.length, 3);
  }
  assert.equal((html.match(/class="offering"/g) ?? []).length, 5);
  assert.equal((html.match(/<h3>How we help<\/h3>/g) ?? []).length, 5);
  assert.equal((html.match(/<h3>Typical outputs<\/h3>/g) ?? []).length, 5);
  assert.ok(!html.includes("<details"));
  assert.ok(!html.includes("01 /"));
});

test("Services covers new products and existing builds across the full agreed offering without guarantees", () => {
  const text = JSON.stringify(serviceAreas);
  for (const offering of [
    "Product management",
    "UX/UI",
    "frontend",
    "backend",
    "iOS",
    "Android",
    "AI",
    "MVP",
    "AI-generated",
    "authentication",
    "database migrations",
    "QA",
    "Accessibility",
    "App Store",
    "Google Play",
    "hosting migrations",
  ]) {
    assert.ok(
      text.toLowerCase().includes(offering.toLowerCase()),
      `Missing ${offering}`,
    );
  }
  const html = render();
  assert.ok(html.includes("Store approval is decided by Apple and Google"));
  assert.ok(html.includes("not a guarantee of approval"));
  assert.ok(!html.includes("100+"));
  assert.ok(!html.includes("guaranteed"));
  assert.ok(!html.includes("$"));
});

test("Services links to real expertise pages and uses the existing certification source", () => {
  const html = render();
  for (const { key, name, href } of expertiseNavigation) {
    assert.ok(html.includes(`href="${href}"`));
    assert.ok(html.includes(`<h3>${name}</h3>`));
    assert.ok(html.includes(`src="${expertisePages[key].logo}"`));
  }
  assert.equal((html.match(/Certified expert/g) ?? []).length, 2);
  assert.equal((html.match(/Specialist support/g) ?? []).length, 1);
});

test("Services structured data matches visible offerings, with no unsupported pricing or ratings", () => {
  const html = render();
  const script = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(script);
  const graph = JSON.parse(script[1])["@graph"];
  const collection = graph.find(
    (node: { "@type": string }) => node["@type"] === "ItemList",
  );
  assert.deepEqual(
    collection.itemListElement.map(
      (entry: { item: { name: string; description: string; url: string } }) =>
        entry.item,
    ),
    serviceAreas.map((service) => ({
      "@type": "Service",
      name: service.name,
      description: service.introduction,
      url: `https://www.promdevs.com/services#${service.id}`,
      provider: { "@id": "https://www.promdevs.com/#organization" },
    })),
  );
  assert.ok(!script[1].includes("aggregateRating"));
  assert.ok(!script[1].includes("price"));
  const breadcrumb = graph.find(
    (node: { "@type": string }) => node["@type"] === "BreadcrumbList",
  );
  assert.equal(
    breadcrumb.itemListElement[1].item,
    "https://www.promdevs.com/services",
  );
});

test("desktop, mobile and no-JavaScript navigation and footer capabilities reach Services", async () => {
  const header = await readFile(
    new URL("../components/Header.tsx", import.meta.url),
    "utf8",
  );
  assert.equal((header.match(/href="\/services"/g) ?? []).length, 3);
  assert.ok(header.includes(".site-header{position:relative!important}"));
  const footer = await readFile(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(footer.includes("items: serviceAreas.map"));
  assert.ok(footer.includes("href: `/services#${id}`"));
  assert.ok(!footer.includes('href="/#services"'));
  const page = await readFile(
    new URL("../app/services/page.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(page.includes('canonical: "/services"'));
  assert.ok(page.includes('path: "/services"'));
  assert.ok(page.includes("...socialMetadata("));
  assert.ok(page.includes("servicesDescription"));
  assert.ok(servicesDescription.includes("Product management"));
  const css = await readFile(
    new URL("../app/services/services.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.offerings-directory\s*\{[^}]*position: sticky/s);
  assert.ok(css.includes("@media (max-width: 899px)"));
  assert.ok(css.includes("@media (max-height: 740px)"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("position: static"));
  const source = await readFile(
    new URL("../components/ServicesOverview.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(!source.includes('"use client"'));
  assert.ok(!source.includes("getProjects"));
});
