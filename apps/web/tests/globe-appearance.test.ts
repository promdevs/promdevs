import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientGlobe } from "../components/globe/ClientGlobe";
import { getWorkCountries } from "../data/countries";
import { globeUsesDarkPalette } from "../lib/globe-appearance";
import { readFile } from "node:fs/promises";

test("the Blue Hour globe declares its own dark appearance without changing public country input", () => {
  const countries = getWorkCountries();
  const before = JSON.stringify(countries);
  const html = renderToStaticMarkup(
    createElement(ClientGlobe, { countries, appearance: "dark" }),
  );
  assert.ok(html.includes('data-appearance="dark"'));
  assert.ok(html.includes("/images/globe-poster.svg"));
  assert.ok(html.includes('aria-label="Interactive world globe"'));
  assert.ok(html.includes("not client addresses"));
  for (const country of countries)
    assert.ok(html.includes(`aria-label="Explore ${country.name}"`));
  assert.equal(JSON.stringify(countries), before);
  assert.ok(!html.includes("<canvas"));
});

test("other globe consumers can still inherit the page theme", () => {
  const html = renderToStaticMarkup(
    createElement(ClientGlobe, { countries: [] }),
  );
  assert.ok(html.includes('data-appearance="auto"'));
  assert.ok(html.includes("/images/globe-poster.svg"));
  assert.ok(!html.includes('class="globe-marker"'));
});

test("inverse appearance stays opposite the page and retains a static fallback", () => {
  assert.equal(globeUsesDarkPalette("inverse", false), true);
  assert.equal(globeUsesDarkPalette("inverse", true), false);
  assert.equal(globeUsesDarkPalette("auto", false), false);
  assert.equal(globeUsesDarkPalette("auto", true), true);
  assert.equal(globeUsesDarkPalette("dark", false), true);
  assert.equal(globeUsesDarkPalette("dark", true), true);
  const html = renderToStaticMarkup(
    createElement(ClientGlobe, { countries: [], appearance: "inverse" }),
  );
  assert.ok(html.includes('data-appearance="inverse"'));
  assert.ok(html.includes("/images/globe-poster.svg"));
});

test("Client Stories uses an automatic globe and an untextured background, retaining its halo", async () => {
  const source = await readFile(
    new URL("../components/sections/Reviews.tsx", import.meta.url),
    "utf8",
  );
  const css = await readFile(
    new URL("../components/sections/Reviews.module.css", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes('appearance="auto"'));
  assert.doesNotMatch(css, /stipple|grain|url\(/);
  assert.ok(css.includes("--paper: #fff;"));
  assert.ok(css.includes("--paper: #000;"));
  assert.doesNotMatch(css, /#0c0e12/);
  assert.ok(css.includes(":global(.dark) .section"));
  assert.ok(css.includes("conic-gradient("));
  const scene = await readFile(
    new URL("../components/globe/globe-scene.ts", import.meta.url),
    "utf8",
  );
  assert.ok(scene.includes("shellMaterial.color.set(dark ? 0x000000 : 0xffffff)"));
});
