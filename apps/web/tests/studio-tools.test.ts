import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import test from "node:test";
import { studioTools } from "../data/studio-tools";

test("the tool strip includes all requested tools without dropping the existing ones", () => {
  assert.deepEqual(
    studioTools.map((tool) => tool.name),
    [
      "Replit",
      "Lovable",
      "Figma",
      "Anything",
      "Framer",
      "Bolt",
      "Claude",
      "Codex",
      "Base44",
      "Cursor",
    ],
  );
  assert.equal(
    new Set(studioTools.map((tool) => tool.name)).size,
    studioTools.length,
  );
});

test("every tool has a small local brand asset rather than a hotlinked dependency", () => {
  for (const tool of studioTools) {
    assert.match(tool.logo, /^[a-z0-9-]+\.(svg|png)$/);
    const path = new URL(
      `../public/assets/tools/${tool.logo}`,
      import.meta.url,
    );
    assert.ok(statSync(path).size < 30000);
    const asset = readFileSync(path);
    if (tool.logo.endsWith(".svg")) {
      assert.match(asset.toString(), /<svg\b/);
      assert.doesNotMatch(
        asset.toString(),
        /<script\b|<foreignObject\b|onload=/i,
      );
    } else {
      assert.equal(asset.subarray(1, 4).toString(), "PNG");
    }
  }
});
