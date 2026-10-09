import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FAQs } from "../components/sections/FAQs";
import { faqs } from "../data/faqs";

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
