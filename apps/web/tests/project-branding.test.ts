import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectTools } from "../components/ProjectTools";
import { ProjectDestinations } from "../components/ProjectDestinations";
import { ProjectCover } from "../components/ProjectCover";
import { projectDestinations } from "../lib/project-catalog";

test("project toolkits use local brand marks for every supported AI tool and readable fallbacks", async () => {
  const tools = [
    "replit",
    "lovable",
    "claude",
    "codex",
    "base44",
    "cursor",
    "bolt",
    "v0",
    "custom_tool",
  ];
  const html = renderToStaticMarkup(createElement(ProjectTools, { tools }));
  assert.ok(html.includes("Tools behind the build"));
  assert.ok(html.includes("case-tool-monochrome"));
  assert.ok(html.includes("custom tool"));
  assert.ok(html.includes("--tool-accent:#f26207"));
  for (const tool of tools.slice(0, -1)) {
    assert.ok(html.includes(`src="/assets/tools/${tool}.svg"`));
    const svg = await readFile(
      new URL(`../public/assets/tools/${tool}.svg`, import.meta.url),
      "utf8",
    );
    assert.ok(svg.includes("<svg"));
  }
  assert.ok(!html.includes("https://"));
  assert.equal(
    renderToStaticMarkup(createElement(ProjectTools, { tools: [] })),
    "",
  );
});

test("store destinations use untouched local download badges, recognized from live URLs and ordered Apple first", async () => {
  const links = projectDestinations({
    liveUrl: "https://play.google.com/store/apps/details?id=com.example.app",
    appStoreUrl: "https://apps.apple.com/us/app/example/id12345",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.example.app",
    githubUrl: null,
  });
  const html = renderToStaticMarkup(
    createElement(ProjectDestinations, { links }),
  );
  assert.equal((html.match(/class="case-store-link"/g) ?? []).length, 2);
  assert.ok(
    html.indexOf('data-store="app_store"') <
      html.indexOf('data-store="play_store"'),
  );
  assert.ok(html.includes("Download on the App Store"));
  assert.ok(html.includes("Get it on Google Play"));
  assert.equal((html.match(/target="_blank"/g) ?? []).length, 2);
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(!html.includes("action-label-track"));
  for (const name of ["app-store", "google-play"]) {
    assert.ok(html.includes(`src="/assets/stores/${name}.svg"`));
    const svg = await readFile(
      new URL(`../public/assets/stores/${name}.svg`, import.meta.url),
      "utf8",
    );
    assert.ok(svg.includes("<svg"));
    assert.doesNotMatch(svg, /<script|<foreignObject|<image/i);
  }
  assert.equal(
    renderToStaticMarkup(createElement(ProjectDestinations, { links: [] })),
    "",
  );
});

test("cover ambience derives from the uploaded image while retaining one sharp, uncropped accessible image", () => {
  const html = renderToStaticMarkup(
    createElement(ProjectCover, {
      src: "https://media.example.test/cover.png",
      alt: "Actual project cover",
      hasGallery: true,
    }),
  );
  assert.ok(html.includes('class="case-cover-ambience" aria-hidden="true"'));
  assert.ok(html.includes('class="case-cover-wash" aria-hidden="true"'));
  assert.ok(html.includes("background-image:url("));
  assert.ok(html.includes("https://media.example.test/cover.png"));
  assert.equal((html.match(/<img\b/g) ?? []).length, 1);
  assert.ok(html.includes('alt="Actual project cover"'));
  assert.ok(html.includes("object-fit:contain"));
  assert.ok(html.includes('href="#project-gallery"'));
  assert.ok(!html.includes("<canvas"));
  assert.equal(
    renderToStaticMarkup(
      createElement(ProjectCover, { src: "", alt: "", hasGallery: false }),
    ),
    "",
  );
});
