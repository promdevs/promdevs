import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectThumbnail } from "../src/ProjectThumbnail.js";

test("project thumbnail keeps its container and renders a decorative lazy image", () => {
  const html = renderToStaticMarkup(
    createElement(ProjectThumbnail, {
      src: "https://media.example.test/images/projects/cover.png",
    }),
  );
  assert.match(html, /class="catalog-thumbnail"/);
  assert.match(html, /<img[^>]*alt=""[^>]*loading="lazy"/);
});

test("missing project cover uses the same container without an image request", () => {
  const html = renderToStaticMarkup(
    createElement(ProjectThumbnail, { src: null }),
  );
  assert.match(html, /class="catalog-thumbnail"/);
  assert.match(html, /<svg/);
  assert.doesNotMatch(html, /<img/);
});
