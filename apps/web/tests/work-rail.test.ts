import { test } from "node:test";
import assert from "node:assert/strict";
import {
  followWorkPosition,
  workCardLayout,
  workCardPresentation,
  workRailPosition,
  workRailTravel,
} from "../lib/work-rail-motion";
import { workServiceLabel } from "../lib/work-service-label";

test("scroll-follow easing has the same pace across refresh rates and never overshoots", () => {
  const follow = (fps: number) => {
    let position = 0;
    for (let frame = 0; frame < fps / 2; frame++)
      position = followWorkPosition(position, 1, 1000 / fps);
    return position;
  };
  assert.ok(Math.abs(follow(60) - follow(120)) < 0.000001);
  assert.ok(followWorkPosition(0, 1, 1000 / 60) < 0.24);
  assert.equal(followWorkPosition(0.5, 1, 0), 0.5);
  assert.ok(followWorkPosition(0, 1, 5000) < 1);
  assert.ok(followWorkPosition(1, 0, 1000 / 60) > 0);
});

test("active cards start at the heading edge while staying centered below the header", () => {
  assert.deepEqual(workRailPosition(1440, 900, 88, 60, 546), {
    left: 60,
    top: 221,
  });
  for (const width of [320, 390, 768, 1024, 1440]) {
    const headingLeft = width < 768 ? 20 : width < 1024 ? 32 : 56;
    const placement = workRailPosition(width, 844, 76, headingLeft, 640);
    assert.equal(placement.left, headingLeft);
    assert.ok(placement.top >= 88);
  }
});

test("service labels are readable and preserve custom service names", () => {
  assert.equal(
    workServiceLabel("frontend_development"),
    "Frontend development",
  );
  assert.equal(workServiceLabel("qa_performance"), "QA & performance");
  assert.equal(workServiceLabel("ai_development"), "AI development");
  assert.equal(workServiceLabel("Custom service"), "Custom service");
});

test("cards fade in equally from the left and right, without replacing their contents", () => {
  for (const distance of [0, 0.5, 1, 1.5, 2])
    assert.deepEqual(
      workCardPresentation(distance),
      workCardPresentation(-distance),
    );
  assert.equal(workCardPresentation(0).opacity, 1);
  assert.equal(workCardPresentation(2).opacity, 0);
  assert.ok(workCardPresentation(1).opacity > 0.3);
});
test("progression length is bounded on both mobile and desktop", () => {
  assert.equal(workRailTravel(5, 1000), 2200);
  assert.equal(workRailTravel(1, 700), 0);
  assert.equal(workRailTravel(50, 700), 2100);
});
test("card entrances remain smooth and never overscale", () => {
  let previous = 1;
  for (let step = 0; step <= 200; step++) {
    const style = workCardPresentation(step / 100);
    assert.ok(style.opacity <= previous && style.opacity >= 0);
    assert.ok(style.scale <= 1 && style.scale >= 0.975);
    assert.ok(style.y >= 0 && style.y <= 16);
    previous = style.opacity;
  }
});

test("desktop cards provide room for a left/right layout while mobile stays stacked", () => {
  assert.deepEqual(workCardLayout(1440), {
    split: true,
    width: 1100,
    gap: 28,
    padding: 22,
  });
  assert.equal(workCardLayout(1024).split, true);
  assert.equal(workCardLayout(768).split, false);
  for (const width of [320, 390, 768, 1024, 1440])
    assert.ok(workCardLayout(width).width < width);
  assert.equal(workCardLayout(320).width, 256);
});
