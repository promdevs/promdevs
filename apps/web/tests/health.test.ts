import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dynamic, GET } from "../app/health/route";

test("web liveness stays available without fetching any upstream service", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Health checks must not access upstream services");
  });

  for (let check = 0; check < 3; check++) {
    const response = GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      service: "promdevs-web",
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  }

  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(dynamic, "force-dynamic");
});

test("web health handler has no dependency on page or database code", async () => {
  const source = await readFile(
    new URL("../app/health/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\b(?:import|require|fetch)\s*\(?/);
});

test("Docker probes the lightweight health route every 30 seconds, never the homepage", async () => {
  const dockerfile = await readFile(
    new URL("../../../deploy/web.Dockerfile", import.meta.url),
    "utf8",
  );
  const healthcheck = dockerfile
    .split("\n")
    .find((line) => line.startsWith("HEALTHCHECK "));
  assert.ok(healthcheck);
  assert.match(healthcheck, /--interval=30s\b/);
  assert.match(healthcheck, /http:\/\/127\.0\.0\.1:3000\/health(?:\s|$)/);
});
