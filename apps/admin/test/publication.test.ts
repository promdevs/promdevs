import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicationPanel } from "../src/PublicationPanel.js";

const props = {
  kind: "project" as const,
  status: "draft" as const,
  saved: true,
  dirty: false,
  busy: false,
  canPublish: true,
  missing: [],
  onChange: () => {},
};
test("publication panel distinguishes save, readiness, owner permissions and public visibility", () => {
  let html = renderToStaticMarkup(createElement(PublicationPanel, props));
  assert.match(html, /Publish<\/button>/);
  assert.doesNotMatch(html, /disabled=""/);
  for (const change of [
    { saved: false },
    { dirty: true },
    { busy: true },
    { missing: ["Cover image"] },
  ]) {
    html = renderToStaticMarkup(
      createElement(PublicationPanel, { ...props, ...change }),
    );
    assert.match(html, /disabled=""/);
  }
  html = renderToStaticMarkup(
    createElement(PublicationPanel, { ...props, dirty: true }),
  );
  assert.match(html, /Save your changes before publishing/);
  html = renderToStaticMarkup(
    createElement(PublicationPanel, { ...props, canPublish: false }),
  );
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /Only owners and admins/);
  html = renderToStaticMarkup(
    createElement(PublicationPanel, { ...props, status: "published" }),
  );
  assert.match(html, /Unpublish<\/button>/);
  assert.doesNotMatch(html, /disabled=""/);
  html = renderToStaticMarkup(
    createElement(PublicationPanel, { ...props, status: "archived" }),
  );
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /Restore this record/);
});
