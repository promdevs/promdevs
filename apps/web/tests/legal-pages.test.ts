import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalDocument } from "../components/LegalDocument";
import { privacyPolicy, termsOfService } from "../data/legal";
import { site } from "../lib/site";

const render = (document: typeof privacyPolicy) =>
  renderToStaticMarkup(createElement(LegalDocument, { document }));

for (const document of [privacyPolicy, termsOfService]) {
  test(`${document.title} uses the registered operator and readable server-rendered sections`, () => {
    const html = render(document);
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
    assert.ok(html.includes(`<h1>${document.title}</h1>`));
    assert.ok(html.includes("PROMDEVS TECHNOLOGY CONCEPTS"));
    assert.ok(html.includes("2026-11-06"));
    assert.ok(html.includes("6 November 2026"));
    assert.ok(html.includes('aria-label="On this page"'));
    assert.ok(html.includes('href="/?view=html#contact"'));
    assert.ok(html.includes(`href="${document.related.path}"`));
    assert.ok(html.includes('href="mailto:info@promdevs.com"'));
    assert.equal(
      new Set(document.sections.map((s) => s.id)).size,
      document.sections.length,
    );
    for (const section of document.sections) {
      assert.ok(html.includes(`href="#${section.id}"`));
      assert.ok(html.includes(`id="${section.id}"`));
      assert.ok(html.includes(`id="${section.id}-heading"`));
      assert.ok(section.title.length > 0);
    }
    const script = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    assert.ok(script);
    const breadcrumbs = JSON.parse(script[1]);
    assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    assert.equal(
      breadcrumbs.itemListElement.at(-1).item,
      site.url + document.path,
    );
    assert.ok(!/lorem ipsum|\[your |TODO|privacy@promdevs/i.test(html));
  });
}

test("Privacy describes actual consent controls and integrations without promising fixed enquiry deletion", () => {
  const html = render(privacyPolicy);
  for (const text of [
    "Resend",
    "Cal.com",
    "Google Analytics",
    "Cloudflare",
    "attachments",
    "local storage",
    "Privacy request",
    "retention",
    "International processing",
  ])
    assert.ok(html.includes(text));
  for (const href of [
    "https://cal.com/privacy",
    "https://resend.com/legal/privacy-policy",
    "https://policies.google.com/privacy/partners",
  ])
    assert.ok(html.includes(`href="${href}"`));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes("only after you allow"));
  assert.ok(html.includes("Privacy choices"));
  assert.ok(html.includes("180 days"));
  assert.ok(html.includes("does not erase"));
  assert.ok(!html.includes("deleted after 30 days"));
  assert.ok(!html.includes("cookie preferences button"));
});

test("Terms distinguish website use and project contracts without fabricated payment terms or jurisdiction", () => {
  const html = render(termsOfService);
  assert.ok(html.includes("does not by itself create a project contract"));
  assert.ok(html.includes("separate project agreement"));
  assert.ok(html.includes("You retain rights"));
  assert.ok(html.includes("cannot lawfully be excluded or limited"));
  assert.ok(html.includes('href="/privacy-policy"'));
  assert.ok(!html.includes("non-refundable"));
  assert.ok(!html.includes("Delaware"));
  assert.ok(!html.includes("binding arbitration"));
});

test("legal routes have canonical metadata and the shared footer links to both pages", async () => {
  for (const slug of ["privacy-policy", "terms-of-service"]) {
    const page = await readFile(
      new URL(`../app/(legal)/${slug}/page.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(page, /canonical:/);
    assert.match(page, /\.\.\.socialMetadata\(/);
  }
  const footer = await readFile(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(footer.includes('href: "/privacy-policy"'));
  assert.ok(footer.includes('href: "/terms-of-service"'));
  assert.equal(site.legalName, "PROMDEVS TECHNOLOGY CONCEPTS");
});
