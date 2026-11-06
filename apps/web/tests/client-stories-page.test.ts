import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicReview } from "@promdevs/contracts";
import { ClientStoriesDirectory } from "../components/ClientStoriesDirectory";

const review = (id = 1): PublicReview => ({
  id,
  title: null,
  body: `Client feedback ${id}.`,
  rating: 4.9,
  author: {
    name: `Client ${id}`,
    company: "Studio Co",
    role: "Founder",
    avatar: null,
  },
  source: "direct",
  sourceUrl: null,
  reviewedAt: null,
  featured: false,
  projectSlug: null,
});
const render = (reviews: PublicReview[]) =>
  renderToStaticMarkup(createElement(ClientStoriesDirectory, { reviews }));

test("client stories renders every full quote in API order with one lead review, one H1 and no carousel", () => {
  const html = render(Array.from({ length: 14 }, (_, i) => review(i + 1)));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.equal((html.match(/<blockquote>/g) ?? []).length, 14);
  assert.equal(
    (html.match(/class="motion-reveal voices-item voices-lead"/g) ?? []).length,
    1,
  );
  assert.ok(
    html.indexOf("Client feedback 1.") < html.indexOf("Client feedback 14."),
  );
  assert.ok(html.indexOf("Client 1") < html.indexOf("Studio Co"));
  assert.ok(html.indexOf("Studio Co") < html.indexOf("Founder"));
  assert.ok(html.includes("out of 5"));
  assert.ok(!html.includes("aggregateRating"));
  assert.ok(!html.includes("carousel"));
  assert.ok(html.includes('href="/?view=html#contact"'));
});

test("anonymous and sparse reviews never acquire invented identity, rating or project links", () => {
  const html = render([{ ...review(), author: null, rating: null }]);
  assert.ok(html.includes("Anonymous client"));
  assert.ok(!html.includes("Studio Co"));
  assert.ok(!html.includes("Founder"));
  assert.ok(!html.includes("voices-rating"));
  assert.ok(!html.includes("View project"));
  assert.ok(!html.includes("Original review"));
  assert.ok(!html.includes("voices-review-title"));
});

test("reviews escape text and link only their explicit project and safe source URL", () => {
  const html = render([
    {
      ...review(),
      body: "Great <script>alert(1)</script>",
      title: "A <build>",
      projectSlug: "real-project",
      sourceUrl: "https://example.com/review",
    },
  ]);
  assert.ok(html.includes("Great &lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("A &lt;build&gt;"));
  assert.ok(html.includes('href="/projects/real-project"'));
  assert.ok(html.includes('href="https://example.com/review"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  for (const sourceUrl of [
    "javascript:alert(1)",
    "https://user:password@example.com",
    "invalid",
  ]) {
    assert.ok(
      !render([{ ...review(), sourceUrl }]).includes("Original review"),
    );
  }
});

test("an empty review collection has a real empty state, work link and no fictional testimonials", () => {
  const html = render([]);
  assert.ok(html.includes("Client stories are on their way."));
  assert.ok(html.includes('href="/projects"'));
  assert.ok(!html.includes("<blockquote>"));
});

test("client stories has crawlable metadata, a retryable error boundary and footer destination", async () => {
  const page = await readFile(
    new URL("../app/client-stories/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /force-dynamic/);
  assert.match(page, /canonical: "\/client-stories"/);
  assert.match(page, /await getReviewCatalog\(\)/);
  const error = await readFile(
    new URL("../app/client-stories/error.tsx", import.meta.url),
    "utf8",
  );
  assert.match(error, /onClick=\{retry\}/);
  const footer = await readFile(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.match(footer, /label: "Client stories", href: "\/client-stories"/);
});
