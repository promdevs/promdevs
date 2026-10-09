import assert from "node:assert/strict";
import test from "node:test";
import {
  countryPoint,
  markerVisibility,
  reviewReadingTime,
} from "../lib/client-stories-motion";

test("short reviews receive an unhurried minimum reading time", () => {
  assert.equal(reviewReadingTime(""), 12000);
  assert.equal(reviewReadingTime("A concise review."), 12000);
});
test("long reviews get enough reading time without a fixed upper cutoff", () => {
  assert.equal(reviewReadingTime(Array(100).fill("word").join(" ")), 42000);
  assert.equal(reviewReadingTime(Array(200).fill("word").join(" ")), 77000);
});
test("geographic marker points share the globe coordinate system", () => {
  assert.deepEqual(countryPoint(0, 0), [0, 0, 1]);
  for (const [lat, lon] of [
    [90, 0],
    [-90, 30],
    [37, -122],
    [-34, 151],
  ]) {
    assert.ok(Math.abs(Math.hypot(...countryPoint(lat, lon)) - 1) < 1e-10);
  }
});
test("marker notes fade before perspective occlusion and disappear on the far side", () => {
  assert.equal(markerVisibility(1, 3.6), 1);
  assert.equal(markerVisibility(-1, 3.6), 0);
  assert.equal(markerVisibility(1 / 3.6, 3.6), 0);
  assert.equal(markerVisibility(0.3, 3.6), 0);
  const partial = markerVisibility(0.38, 3.6);
  assert.ok(partial > 0 && partial < 1);
  assert.ok(markerVisibility(0.42, 3.6) > partial);
});
