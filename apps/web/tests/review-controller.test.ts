import assert from "node:assert/strict";
import test from "node:test";
import { createReviewRotation } from "../lib/review-controller";

class NodeStub extends EventTarget {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  inert = false;
  textContent = "A short readable review.";
  children: NodeStub[] = [];
  hover = false;
  section: NodeStub = this;
  elements = new Map<string, NodeStub>();
  buttons: NodeStub[] = [];
  querySelectorAll(selector: string) {
    return selector === ".client-quote" ? this.children : this.buttons;
  }
  querySelector(selector: string): NodeStub | null {
    return (
      this.elements.get(selector) ?? (selector === "blockquote" ? this : null)
    );
  }
  closest() {
    return this.section;
  }
  matches() {
    return this.hover;
  }
  contains(node: unknown): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }
  setAttribute(key: string, value: string) {
    this.attributes.set(key, value);
  }
  removeAttribute(key: string) {
    this.attributes.delete(key);
  }
}
class MediaStub extends EventTarget {
  matches = false;
}

test("review rotation pauses for reading and suspends rather than catching up", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const root = new NodeStub(),
    section = new NodeStub();
  const figures = [new NodeStub(), new NodeStub(), new NodeStub()];
  root.children = figures;
  root.section = section;
  section.children = [root];
  const previous = new NodeStub(),
    next = new NodeStub(),
    announcement = new NodeStub(),
    label = new NodeStub();
  previous.dataset.reviewDirection = "-1";
  next.dataset.reviewDirection = "1";
  root.buttons = [previous, next];
  root.elements.set(".review-announcement", announcement);
  root.elements.set(".review-timing-label", label);
  const reduced = new MediaStub(),
    fine = new MediaStub();
  const documentStub = Object.assign(new EventTarget(), {
    hidden: false,
    activeElement: null as unknown,
  });
  let selected = false;
  const windowStub = Object.assign(new EventTarget(), {
    IntersectionObserver: true,
    getSelection: () => ({
      isCollapsed: !selected,
      anchorNode: root,
      focusNode: root,
    }),
  });
  let visibility:
    ((entries: { isIntersecting: boolean }[]) => void) | undefined;
  let disconnected = false;
  class Observer {
    constructor(callback: typeof visibility) {
      visibility = callback;
    }
    observe() {
      visibility?.([{ isIntersecting: true }]);
    }
    disconnect() {
      disconnected = true;
    }
  }
  const replacements = {
    window: windowStub,
    document: documentStub,
    IntersectionObserver: Observer,
    matchMedia: (query: string) => (query.includes("reduced") ? reduced : fine),
  };
  const descriptors = Object.fromEntries(
    Object.keys(replacements).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(replacements))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  let cleanup: (() => void) | undefined;
  const active = () =>
    figures.findIndex((figure) => figure.dataset.active === "true");
  try {
    cleanup = createReviewRotation(root as unknown as HTMLElement, () =>
      Date.now(),
    );
    assert.equal(root.dataset.enhanced, "true");
    assert.equal(active(), 0);
    assert.equal(figures[1].inert, true);
    t.mock.timers.tick(11999);
    assert.equal(active(), 0);
    t.mock.timers.tick(1);
    assert.equal(active(), 1);

    fine.matches = true;
    section.dispatchEvent(new Event("pointerenter"));
    t.mock.timers.tick(60000);
    assert.equal(active(), 1);
    section.dispatchEvent(new Event("pointerleave"));
    t.mock.timers.tick(12000);
    assert.equal(active(), 2);

    // Pausing preserves the remaining hold instead of restarting the countdown.
    t.mock.timers.tick(5000);
    section.dispatchEvent(new Event("pointerenter"));
    assert.equal(root.dataset.playing, "false");
    assert.equal(label.textContent, "Paused while reading");
    t.mock.timers.tick(60000);
    section.dispatchEvent(new Event("pointerleave"));
    t.mock.timers.tick(6999);
    assert.equal(active(), 2);
    t.mock.timers.tick(1);
    assert.equal(active(), 0);
    previous.dispatchEvent(new Event("click"));
    assert.equal(active(), 2);
    next.dispatchEvent(new Event("click"));
    assert.equal(active(), 0);
    assert.match(announcement.textContent, /Review 1 of 3/);
    next.dispatchEvent(new Event("click"));
    next.dispatchEvent(new Event("click"));
    assert.equal(active(), 2);

    documentStub.activeElement = root;
    section.dispatchEvent(new Event("focusin"));
    t.mock.timers.tick(60000);
    assert.equal(active(), 2);
    documentStub.activeElement = null;
    documentStub.dispatchEvent(new Event("selectionchange"));
    t.mock.timers.tick(12000);
    assert.equal(active(), 0);

    selected = true;
    documentStub.dispatchEvent(new Event("selectionchange"));
    t.mock.timers.tick(60000);
    assert.equal(active(), 0);
    selected = false;
    documentStub.dispatchEvent(new Event("selectionchange"));
    t.mock.timers.tick(12000);
    assert.equal(active(), 1);

    documentStub.hidden = true;
    documentStub.dispatchEvent(new Event("visibilitychange"));
    t.mock.timers.tick(60000);
    assert.equal(active(), 1);
    documentStub.hidden = false;
    documentStub.dispatchEvent(new Event("visibilitychange"));
    t.mock.timers.tick(11999);
    assert.equal(active(), 1);
    t.mock.timers.tick(1);
    assert.equal(active(), 2);

    visibility?.([{ isIntersecting: false }]);
    t.mock.timers.tick(60000);
    assert.equal(active(), 2);
    visibility?.([{ isIntersecting: true }]);
    t.mock.timers.tick(12000);
    assert.equal(active(), 0);

    const touch = Object.assign(new Event("pointerdown"), {
      pointerType: "touch",
    });
    section.dispatchEvent(touch);
    t.mock.timers.tick(60000);
    assert.equal(active(), 0);
    windowStub.dispatchEvent(new Event("pointerup"));
    t.mock.timers.tick(12000);
    assert.equal(active(), 1);

    reduced.matches = true;
    reduced.dispatchEvent(new Event("change"));
    assert.equal(root.dataset.enhanced, "true");
    assert.equal(root.dataset.autoplay, "false");
    assert.equal(figures[0].inert, true);
    t.mock.timers.tick(60000);
    assert.equal(active(), 1);
    next.dispatchEvent(new Event("click"));
    assert.equal(active(), 2);
    previous.dispatchEvent(new Event("click"));
    assert.equal(active(), 1);
    reduced.matches = false;
    reduced.dispatchEvent(new Event("change"));
    t.mock.timers.tick(12000);
    assert.equal(active(), 2);

    cleanup?.();
    cleanup = undefined;
    assert.equal(disconnected, true);
    assert.equal(root.dataset.enhanced, undefined);
    t.mock.timers.tick(60000);
    assert.equal(active(), 2);
  } finally {
    cleanup?.();
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
