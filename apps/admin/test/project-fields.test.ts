import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownEdit, mediaGuidance } from "../src/project-field-helpers";

test("inline formatting preserves surrounding text and selects the formatted content", () => {
  const edit = markdownEdit("A good idea.", 2, 6, "bold");
  assert.equal(edit.value, "A **good** idea.");
  assert.equal(edit.value.slice(edit.start, edit.end), "good");
  assert.equal(markdownEdit("", 0, 0, "italic").value, "*text*");
  assert.equal(markdownEdit("", 0, 0, "code").value, "`code`");
});

test("link insertion selects the destination for immediate replacement", () => {
  const edit = markdownEdit("Our product", 4, 11, "link");
  assert.equal(edit.value, "Our [product](https://example.com)");
  assert.equal(edit.value.slice(edit.start, edit.end), "https://example.com");
});

test("block formatting expands to complete lines and preserves following paragraphs", () => {
  assert.equal(
    markdownEdit("First\nSecond\nThird", 1, 6, "bullets").value,
    "- First\nSecond\nThird",
  );
  assert.equal(
    markdownEdit("First\nSecond\nThird", 0, 12, "numbered").value,
    "1. First\n2. Second\nThird",
  );
  assert.equal(
    markdownEdit("A title\nBody", 3, 3, "heading").value,
    "## A title\nBody",
  );
});

test("empty fields and leading blank lines receive usable Markdown examples", () => {
  assert.equal(markdownEdit("", 0, 0, "quote").value, "> Quote");
  assert.equal(markdownEdit("", 0, 0, "bullets").value, "- List item");
  assert.equal(
    markdownEdit("\nBody", 0, 0, "heading").value,
    "## Heading\nBody",
  );
});

test("upload guidance distinguishes cover, gallery, and social image requirements", () => {
  assert.match(mediaGuidance.cover.recommendation, /4:3.*1600.*1200/);
  assert.match(mediaGuidance.social.recommendation, /1200.*630/);
  assert.match(mediaGuidance.gallery.formats, /50 MiB/);
  assert.ok(!mediaGuidance.cover.accept.includes("video/"));
  assert.ok(mediaGuidance.gallery.accept.includes("video/webm"));
});
