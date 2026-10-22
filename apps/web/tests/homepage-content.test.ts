import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FAQs } from "../components/sections/FAQs";
import { faqs } from "../data/faqs";
import { ActionButton, ActionLink } from "../components/Action";
import { site } from "../lib/site";

test("FAQs are server-rendered native disclosures with all answers available without JavaScript", () => {
  const html = renderToStaticMarkup(createElement(FAQs));
  assert.ok(html.includes('id="faqs"'));
  assert.ok(html.includes('aria-labelledby="faqs-title"'));
  assert.equal((html.match(/<details/g) ?? []).length, faqs.length);
  assert.equal((html.match(/<summary/g) ?? []).length, faqs.length);
  for (const { question, answer } of faqs) {
    assert.ok(html.includes(question));
    assert.ok(answer.length > 50);
  }
  assert.ok(html.includes("Store approval remains subject to each platform"));
  assert.ok(!html.includes("Your next chapter"));
});

test("explicit recovery links include security attributes and a new-tab announcement", () => {
  const html = renderToStaticMarkup(
    createElement(ActionLink, {
      href: site.bookingUrl,
      label: "Book a call",
      newTab: true,
    }),
  );
  assert.ok(html.includes('href="https://cal.com/promdevs/discovery-call"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes("Book a call (opens in a new tab)"));
  assert.ok(!html.includes("<iframe"));
  assert.ok(!html.includes("<script"));
});

test("existing internal action links keep their same-tab navigation", () => {
  const html = renderToStaticMarkup(
    createElement(ActionLink, {
      href: "/projects",
      label: "View our work",
    }),
  );
  assert.ok(html.includes('href="/projects"'));
  assert.ok(!html.includes('target="_blank"'));
  assert.ok(!html.includes("opens in a new tab"));
});

test("booking disclosure buttons expose their relationship and cannot navigate away", () => {
  const html = renderToStaticMarkup(
    createElement(ActionButton, {
      type: "button",
      label: "Book a call",
      "aria-controls": "contact-calendar",
      "aria-expanded": true,
    }),
  );
  assert.ok(html.includes('aria-controls="contact-calendar"'));
  assert.ok(html.includes('aria-expanded="true"'));
  assert.ok(!html.includes('target="_blank"'));
  assert.ok(!html.includes("href="));
});
