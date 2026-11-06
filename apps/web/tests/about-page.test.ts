import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AboutStudio } from "../components/AboutStudio";
import { studioDisciplines, studioFounder } from "../data/studio";

const render = () => renderToStaticMarkup(createElement(AboutStudio));

test("About clearly presents all five team disciplines without implying the founder fills every role", () => {
  const html = render();
  const intro = html.match(/class="about-intro-copy">([\s\S]*?)<\/p>/)?.[1];
  assert.ok(intro);
  assert.equal((html.match(/class="about-team-discipline"/g) ?? []).length, 5);
  assert.ok(html.includes("<h3>Mobile developers</h3>"));
  assert.ok(html.includes("Build iOS and Android apps"));
  for (const { role, discipline, description } of studioDisciplines) {
    assert.ok(html.includes(`<h3>${role}</h3>`));
    assert.ok(intro.includes(discipline.toLowerCase()));
    assert.ok(html.includes(description));
  }
  assert.ok(html.includes("Our founder"));
  assert.ok(!html.includes("The person behind the studio"));
  assert.ok(html.includes("Moses leads the studio"));
  assert.ok(
    html.indexOf('id="about-team-heading"') <
      html.indexOf('id="about-founder-heading"'),
  );
  const script = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(script);
  const organization = JSON.parse(script[1])["@graph"].find(
    (node: { "@type": string }) => node["@type"] === "Organization",
  );
  assert.deepEqual(
    organization.knowsAbout,
    studioDisciplines.map(({ discipline }) => discipline),
  );
  assert.ok(!("employee" in organization));
  assert.ok(!("numberOfEmployees" in organization));
});

test("About introduces the studio with one H1 and descriptions beneath headings", () => {
  const html = render();
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.ok(html.includes("A product studio."));
  assert.ok(html.includes("Built around you."));
  assert.ok(!/independent/i.test(html));
  assert.ok(html.indexOf("</h1>") < html.indexOf('class="about-intro-copy"'));
  assert.ok(
    html.indexOf('id="about-founder-heading"') <
      html.indexOf('class="about-founder-description"'),
  );
  assert.ok(html.includes("a digital product studio"));
  assert.ok(html.includes(studioFounder.name));
  assert.ok(html.includes(`@${studioFounder.alias}`));
  assert.ok(html.includes("Founder, PromDevs"));
  assert.ok(html.includes("web apps"));
  assert.ok(html.includes("mobile apps"));
  assert.ok(html.includes("AI products"));
});

test("About includes only established expertise and real local brand assets, not fictional people or metrics", () => {
  const html = render();
  assert.ok(html.includes("Lovable &amp; Replit expert."));
  assert.ok(html.includes('src="/assets/tools/lovable.svg"'));
  assert.ok(html.includes('src="/assets/tools/replit.svg"'));
  assert.ok(!html.includes("100+"));
  assert.ok(!html.includes("years of experience"));
  assert.ok(!html.includes("team of"));
  assert.ok(!html.includes("aggregateRating"));
  assert.ok(!html.includes("Coming soon"));
});

test("About is server-readable with existing contact, work, and client-story destinations", () => {
  const html = render();
  for (const href of ["/?view=html#contact", "/projects", "/client-stories"])
    assert.ok(html.includes(`href="${href}"`));
  assert.equal((html.match(/class="about-principle"/g) ?? []).length, 3);
  const script = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(script);
  const graph = JSON.parse(script[1])["@graph"];
  const about = graph.find(
    (node: { "@type": string }) => node["@type"] === "AboutPage",
  );
  const breadcrumbs = graph.find(
    (node: { "@type": string }) => node["@type"] === "BreadcrumbList",
  );
  assert.equal(about.url, "https://www.promdevs.com/about");
  assert.equal(
    breadcrumbs.itemListElement.at(-1).item,
    "https://www.promdevs.com/about",
  );
});

test("the visible founder identity matches the Person and Organization relationship without invented profile links", () => {
  const html = render();
  const script = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  assert.ok(script);
  const graph = JSON.parse(script[1])["@graph"];
  const person = graph.find(
    (node: { "@type": string }) => node["@type"] === "Person",
  );
  const organization = graph.find(
    (node: { "@type": string }) => node["@type"] === "Organization",
  );
  assert.equal(person.name, "Moses Adebayo");
  assert.equal(person.alternateName, "muzardemoses");
  assert.equal(person.jobTitle, "Founder");
  assert.equal(organization.founder["@id"], person["@id"]);
  assert.equal(person.worksFor["@id"], organization["@id"]);
  assert.ok(!("sameAs" in person));
  assert.equal(
    person.image,
    `https://www.promdevs.com${studioFounder.portrait}`,
  );
  assert.ok(!html.includes("<blockquote"));
});

test("the studio explains multiple starting points as ordinary HTML without carousels or hidden panels", () => {
  const html = render();
  assert.equal((html.match(/class="about-path"/g) ?? []).length, 3);
  for (const text of [
    "A rough idea",
    "A promising prototype",
    "An existing product",
    "AI-generated build",
    "A clear product direction",
    "A production-ready product",
    "A better way forward",
  ])
    assert.ok(html.includes(text));
  assert.ok(html.includes('class="about-founder-photo"'));
  assert.ok(!html.includes("about-founder-monogram"));
  assert.ok(!html.includes("<canvas"));
  assert.ok(!html.includes("<iframe"));
  assert.ok(!html.includes('role="tab"'));
});

test("founder portrait uses the local edited photo with accessible text and reserved dimensions", async () => {
  const html = render();
  assert.ok(html.includes('alt="Moses Adebayo, founder of PromDevs"'));
  assert.ok(html.includes(encodeURIComponent(studioFounder.portrait)));
  const portrait = await readFile(
    new URL(`../public${studioFounder.portrait}`, import.meta.url),
  );
  assert.equal(portrait.subarray(8, 12).toString(), "WEBP");
  assert.ok(portrait.byteLength < 350000);
  const css = await readFile(
    new URL("../app/about/about.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.about-founder-photo\s*\{[^}]*aspect-ratio: 4 \/ 5/s);
  assert.match(css, /object-position: center top/);
});

test("About groups a compact founder bio with the team and keeps sections in a clear narrative order", async () => {
  const html = render();
  const founder = html.match(
    /<aside class="about-founder"[\s\S]*?<\/aside>/,
  )?.[0];
  assert.ok(founder);
  assert.ok(founder.includes(studioFounder.name));
  assert.ok(founder.includes(studioFounder.alias));
  assert.ok(!html.includes("about-founder-story"));
  assert.ok(!html.includes("about-founder-section"));
  const headings = [
    "about-team-heading",
    "about-founder-heading",
    "about-starting-heading",
    "about-tools-heading",
    "about-principles-heading",
  ];
  const positions = headings.map((id) => html.indexOf(`id="${id}"`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(
    positions,
    [...positions].sort((a, b) => a - b),
  );
  const css = await readFile(
    new URL("../app/about/about.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.about-founder-photo\s*\{[^}]*width: 120px/s);
  assert.match(css, /\.about-founder-photo\s*\{[^}]*width: 96px/s);
  const footer = await readFile(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(!footer.includes("independent digital product studio"));
});

test("About has metadata and working desktop, mobile, no-script and footer navigation", async () => {
  const page = await readFile(
    new URL("../app/about/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /canonical: "\/about"/);
  assert.match(page, /title: "About the studio"/);
  const header = await readFile(
    new URL("../components/Header.tsx", import.meta.url),
    "utf8",
  );
  assert.equal((header.match(/href="\/about"/g) ?? []).length, 3);
  const footer = await readFile(
    new URL("../components/Footer.tsx", import.meta.url),
    "utf8",
  );
  assert.match(footer, /label: "About us", href: "\/about"/);
});
