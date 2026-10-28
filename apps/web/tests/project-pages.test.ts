import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicProject, PublicReview } from "@promdevs/contracts";
import {
  breadcrumbData,
  projectDestinations,
  projectPageTitle,
} from "../lib/project-catalog";
import {
  orderedProjectMedia,
  projectGalleryLayout,
} from "../lib/project-media";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectsDirectory } from "../components/ProjectsDirectory";
import { ProjectMarkdown } from "../components/ProjectMarkdown";
import { ProjectCaseStudy } from "../components/ProjectCaseStudy";
import { ProjectFeedback } from "../components/ProjectFeedback";

const project = (id = 1): PublicProject => ({
  id,
  title: `Product ${id}`,
  slug: `product-${id}`,
  description: "An existing product, redesigned and rebuilt.",
  category: "Education",
  year: null,
  productTypes: ["web_app"],
  platforms: ["web"],
  coverImage: "https://media.example.test/cover.png",
  coverAlt: "A product interface",
  featured: false,
  publishedAt: "2026-10-08T10:00:00Z",
  status: "completed",
  roleSummary: null,
  services: [],
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
});
const render = (component: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(component);

test("project feedback renders actual quotes and independent review attribution before the contact panel", () => {
  const review: PublicReview = {
    id: 1,
    projectSlug: "product-1",
    title: null,
    body: "Great work, <script>not markup</script>.",
    rating: 4.9,
    reviewedAt: null,
    source: "direct",
    sourceUrl: "https://example.com/review",
    featured: false,
    author: {
      name: "Review Author",
      company: "Their company",
      role: "Founder",
      avatar: null,
    },
  };
  const html = render(
    createElement(ProjectCaseStudy, {
      project: { ...project(), client: null },
      feedback: createElement(ProjectFeedback, { reviews: [review] }),
    }),
  );
  assert.ok(html.includes("Client feedback."));
  assert.ok(html.includes("4.9"));
  assert.ok(html.includes("out of 5"));
  assert.ok(html.includes("&lt;script&gt;not markup&lt;/script&gt;"));
  assert.ok(html.indexOf("Review Author") < html.indexOf("Their company"));
  assert.ok(html.indexOf("Their company") < html.indexOf("Founder"));
  assert.ok(
    html.indexOf('class="case-feedback"') <
      html.indexOf('class="motion-reveal case-end"'),
  );
  assert.ok(html.includes('href="https://example.com/review"'));
  assert.ok(!html.includes('class="case-fact-client"'));
  const anonymous = render(
    createElement(ProjectFeedback, {
      reviews: [
        {
          ...review,
          author: null,
          rating: null,
          sourceUrl: "javascript:alert(1)",
        },
      ],
    }),
  );
  assert.ok(anonymous.includes("Anonymous client"));
  assert.ok(!anonymous.includes("Review Author"));
  assert.ok(!anonymous.includes("case-review-rating"));
  assert.ok(!anonymous.includes("javascript:"));
  assert.equal(render(createElement(ProjectFeedback, { reviews: [] })), "");
});

test("the portfolio has a direct introduction without an eyebrow or redundant breadcrumb", () => {
  const projects = [project(1), project(2)];
  const html = render(createElement(ProjectsDirectory, { projects }));
  assert.ok(html.includes("<h1>A closer look at our work.</h1>"));
  assert.ok(!html.includes("Made for people."));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.ok(!html.includes('class="eyebrow"'));
  assert.ok(!html.includes('aria-label="Breadcrumb"'));
  assert.ok(!html.includes('class="catalog-results-meta"'));
  for (const [index, item] of projects.entries()) {
    const card = render(createElement(ProjectCard, { project: item, index }));
    const article = card.match(/<article\b[\s\S]*?<\/article>/)?.[0];
    assert.ok(article && html.includes(article));
  }
});

test("directory shows every project in API order without filters, counts or pagination", () => {
  const projects = Array.from({ length: 29 }, (_, index) => ({
    ...project(29 - index),
    productTypes: [index % 2 ? "mobile_app" : "web_app"],
  }));
  const html = render(createElement(ProjectsDirectory, { projects }));
  const links = [...html.matchAll(/href="\/projects\/(product-\d+)"/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(
    links,
    projects.map((item) => item.slug),
  );
  assert.ok(!html.includes("Filter projects by product type"));
  assert.ok(!html.includes("catalog-types"));
  assert.ok(!html.includes("catalog-pagination"));
  assert.ok(!html.includes('role="search"'));
  assert.ok(!html.includes("Reset filters"));
  const empty = render(createElement(ProjectsDirectory, { projects: [] }));
  assert.ok(empty.includes("More work to share soon."));
  assert.ok(empty.includes('href="/#contact"'));
});

test("legacy filter URLs redirect to the complete portfolio and filter styles are removed", async () => {
  const page = await readFile(
    new URL("../app/projects/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(page, /params\.type !== undefined/);
  assert.match(page, /redirect\("\/projects"\)/);
  assert.ok(!page.includes("selectCatalog"));
  const css = await readFile(
    new URL("../app/projects/projects.css", import.meta.url),
    "utf8",
  );
  assert.ok(!css.includes("catalog-types"));
});

test("compact cards have one project link, an H2, cover alt, and escaped content", () => {
  const html = render(
    createElement(ProjectCard, {
      project: { ...project(), title: "<script>bad</script>" },
    }),
  );
  assert.equal((html.match(/href="\/projects\/product-1"/g) ?? []).length, 1);
  assert.ok(html.includes("<h2>"));
  assert.ok(html.includes('alt="A product interface"'));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes('pathLength="100"'));
  const fallback = render(
    createElement(ProjectCard, { project: { ...project(), coverImage: "" } }),
  );
  assert.ok(fallback.includes("Preview unavailable"));
  assert.ok(fallback.includes("Product 1"));
});

test("Markdown supports the admin guide without HTML, images, unsafe links or extra H1s", () => {
  const html = render(
    createElement(
      ProjectMarkdown,
      null,
      "# Heading\n\n**Bold** and *italic* with `code`.\n\n- First\n- Second\n\n1. One\n2. Two\n\n> Quote\n\n```js\nconst ready = true;\n```\n\n[Safe](https://example.com) [Bad](javascript:alert%281%29)\n\n![Image](https://example.com/image.png)\n\n<script>alert(1)</script>",
    ),
  );
  for (const tag of [
    "<h3>",
    "<strong>",
    "<em>",
    "<ul>",
    "<ol>",
    "<blockquote>",
    "<pre>",
    "<code",
  ])
    assert.ok(html.includes(tag), tag);
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(!html.includes("<h1"));
  assert.ok(!html.includes("<script"));
  assert.ok(!html.includes("javascript:"));
  assert.ok(!html.includes("<img"));
});

test("destination labels recognize app stores in liveUrl and deduplicate listings", () => {
  const links = projectDestinations({
    liveUrl: "https://apps.apple.com/us/app/example/id12345",
    appStoreUrl:
      "https://apps.apple.com/gb/app/other-name/id12345?utm_source=test",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.example.app",
    githubUrl: "https://github.com/example/app",
  });
  assert.deepEqual(
    links.map((link) => link.label),
    ["App Store", "Google Play", "View source"],
  );
  assert.equal(
    projectDestinations({ ...project(), liveUrl: "https://example.com" })[0]
      .label,
    "Visit website",
  );
  assert.deepEqual(
    projectDestinations({
      ...project(),
      liveUrl: "javascript:alert(1)",
      githubUrl: "https://user:password@example.com",
    }),
    [],
  );
});

test("sparse projects omit empty story, facts and gallery while keeping a usable page", () => {
  const html = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        coverImage: "",
        platforms: [],
        productTypes: [],
      },
    }),
  );
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.ok(html.includes("Have a project"));
  assert.ok(!html.includes('class="case-facts"'));
  assert.ok(!html.includes("The challenge"));
  assert.ok(!html.includes('class="project-gallery"'));
  assert.ok(!html.includes("Client</dt>"));
  assert.ok(html.includes('href="/#contact"'));
});

test("case study introduction reads title, description, then shared destination actions", () => {
  const html = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        liveUrl: "https://example.com",
        githubUrl: "https://github.com/example/project",
      },
    }),
  );
  assert.ok(!html.includes('aria-label="Breadcrumb"'));
  assert.ok(html.includes("All projects"));
  assert.ok(html.indexOf("<h1>") < html.indexOf('class="case-description"'));
  assert.ok(
    html.indexOf('class="case-description"') <
      html.indexOf('class="case-destinations"'),
  );
  const destinations = html.match(
    /class="case-destinations"[\s\S]*?<\/a>[\s\S]*?<\/a>/,
  )?.[0];
  assert.ok(destinations);
  assert.ok(destinations.includes("action-primary"));
  assert.ok(destinations.includes("action-secondary"));
  assert.equal((destinations.match(/target="_blank"/g) ?? []).length, 2);
  assert.ok(html.includes("Have a project in mind?"));
});

test("long role summaries are readable Markdown, not miniature project facts", () => {
  const html = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        platforms: [],
        roleSummary:
          "**Design and engineering.**\n\nA collaboration from prototype to launch.",
      },
    }),
  );
  assert.ok(html.includes("<h2>Our role</h2>"));
  assert.ok(html.includes("<strong>Design and engineering.</strong>"));
  assert.ok(!html.includes("<dt>Our role</dt>"));
  assert.ok(!html.includes('class="case-facts"'));
});

test("portrait gallery previews stay bounded without cropping or becoming full-width banners", async () => {
  const html = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        gallery: [
          {
            type: "image",
            src: "https://media.example.test/mobile.png",
            alt: "Mobile interface",
            poster: null,
            width: 390,
            height: 844,
          },
        ],
      },
    }),
  );
  assert.ok(html.includes("project-gallery-portrait"));
  assert.ok(!html.includes("project-gallery-wide"));
  assert.ok(html.includes("aspect-ratio:390 / 844"));
  assert.ok(html.includes("object-fit:contain"));
  const css = await readFile(
    new URL("../app/projects/projects.css", import.meta.url),
    "utf8",
  );
  assert.match(
    css,
    /\.project-gallery-portrait\s*\{[^}]*width: min\(100%, 360px\)/s,
  );
  assert.match(css, /\.project-gallery-frame\s*\{[^}]*max-height: 720px/s);
  assert.match(css, /\.case-story-section > h2\s*\{[^}]*margin-bottom:/s);
});

test("multiple phone previews use a paired gallery without changing media order", () => {
  const gallery = [1, 2, 3].map((id) => ({
    type: "image" as const,
    src: `https://media.example.test/screen-${id}.png`,
    alt: `Screen ${id}`,
    width: 390,
    height: 844,
    poster: null,
  }));
  const html = render(
    createElement(ProjectCaseStudy, { project: { ...project(), gallery } }),
  );
  assert.ok(html.includes("project-gallery-grid project-gallery-phones"));
  assert.equal(
    (
      html.match(
        /class="motion-reveal project-gallery-item project-gallery-portrait"/g,
      ) ?? []
    ).length,
    3,
  );
  assert.ok(html.indexOf('alt="Screen 1"') < html.indexOf('alt="Screen 2"'));
  assert.ok(html.indexOf('alt="Screen 2"') < html.indexOf('alt="Screen 3"'));
});

test("gallery size ordering leads with larger media, keeps matching exports in source order, and never mutates data", () => {
  const media = (src: string, width?: number, height?: number) => ({
    type: "image" as const,
    src,
    width,
    height,
    poster: null,
  });
  const input = [
    media("unknown"),
    media("phone-a", 941, 1672),
    media("phone-b", 942, 1670),
    media("large", 2400, 1600),
    media("same-a", 800, 600),
    media("same-b", 800, 600),
  ];
  const before = [...input];
  assert.deepEqual(
    orderedProjectMedia(input).map((item) => item.src),
    ["large", "phone-a", "phone-b", "same-a", "same-b", "unknown"],
  );
  assert.deepEqual(input, before);
  assert.deepEqual(orderedProjectMedia([]), []);
  assert.deepEqual(
    orderedProjectMedia([media("a"), media("b")]).map((item) => item.src),
    ["a", "b"],
  );
  assert.equal(projectGalleryLayout([media("phone", 390, 844)]), "phones");
  assert.equal(
    projectGalleryLayout([
      media("desktop", 1440, 1273),
      media("mobile", 390, 844),
    ]),
    "mixed",
  );
});

test("case studies use meaningful icon badges and only link to populated story sections", () => {
  const html = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        services: ["product_design", "deployment"],
        problem: "A real challenge.",
        results: "A recorded outcome.",
      },
    }),
  );
  assert.ok(html.includes('class="case-type-badge"'));
  assert.ok(html.includes('class="case-service-badges"'));
  assert.ok(html.includes("What we delivered"));
  assert.ok(html.includes("Product design"));
  assert.ok(html.includes("Deployment"));
  assert.ok(html.includes('aria-label="Inside this project"'));
  for (const id of ["challenge", "outcome"]) {
    assert.ok(html.includes(`href="#case-${id}"`));
    assert.ok(html.includes(`id="case-${id}"`));
  }
  assert.ok(!html.includes('href="#case-approach"'));
  assert.ok(!html.includes('href="#project-gallery"'));
  assert.ok(html.includes("case-story-outcome"));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  const ongoing = render(
    createElement(ProjectCaseStudy, {
      project: {
        ...project(),
        status: "ongoing",
        services: ["product_design"],
      },
    }),
  );
  assert.ok(
    ongoing.includes("What we&#x27;re working on") ||
      ongoing.includes("What we&#39;re working on"),
  );
  assert.ok(!ongoing.includes("What we delivered"));
});

test("complete case studies render real facts, Markdown and size-ordered media in server HTML", () => {
  const item = {
    ...project(),
    duration: "8 weeks",
    year: 2026,
    roleSummary: "Design and engineering",
    services: ["product_design", "qa_performance"],
    builtWith: ["lovable"],
    client: { name: "Public Client", logo: null, websiteUrl: null },
    skills: [
      { name: "React", slug: "react", category: "frontend", iconUrl: null },
    ],
    problem: "**An unfinished build.**",
    results: "Ready for launch.",
    gallery: [
      {
        type: "image" as const,
        src: "https://media.example.test/portrait.png",
        alt: "Portrait",
        poster: null,
        caption: "An interface",
        width: 600,
        height: 1200,
      },
      {
        type: "video" as const,
        src: "https://media.example.test/demo.mp4",
        poster: "https://media.example.test/poster.png",
        width: 1600,
        height: 900,
      },
      {
        type: "image" as const,
        src: "https://media.example.test/wide.png",
        alt: "Landscape",
        poster: null,
      },
    ],
  };
  const html = render(createElement(ProjectCaseStudy, { project: item }));
  assert.ok(html.includes("8 weeks"));
  assert.ok(html.includes("QA &amp; performance"));
  assert.ok(html.includes("Public Client"));
  assert.ok(html.includes("Lovable"));
  assert.ok(html.includes("React"));
  assert.ok(html.includes("<strong>An unfinished build.</strong>"));
  assert.ok(!html.includes("Our approach"));
  assert.ok(html.includes('href="https://media.example.test/portrait.png"'));
  assert.ok(html.indexOf("<video") < html.indexOf('alt="Portrait"'));
  assert.ok(html.indexOf('alt="Portrait"') < html.indexOf('alt="Landscape"'));
  assert.ok(html.includes('preload="none"'));
  assert.ok(!html.includes("autoPlay"));
  assert.ok(!html.includes("autoplay"));
  assert.ok(html.includes('aria-labelledby="project-lightbox-title"'));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
});

test("breadcrumbs encode titles safely and match the visible route hierarchy", () => {
  const json = breadcrumbData("https://www.promdevs.com", [
    { name: "Home", path: "/" },
    { name: "Our work", path: "/projects" },
    { name: "</script><script>bad</script>", path: "/projects/product-1" },
  ]);
  assert.ok(!json.includes("<"));
  const data = JSON.parse(json);
  assert.equal(data.itemListElement.length, 3);
  assert.equal(
    data.itemListElement[2].item,
    "https://www.promdevs.com/projects/product-1",
  );
  assert.equal(data.itemListElement[2].position, 3);
});

test("project metadata avoids adding the studio brand twice", () => {
  assert.equal(
    projectPageTitle({
      title: "Product",
      seoTitle: "Product case study | PromDevs",
    }),
    "Product case study",
  );
  assert.equal(
    projectPageTitle({ title: "Product", seoTitle: null }),
    "Product",
  );
});
