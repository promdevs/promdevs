import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { handleContact } from "../lib/contact-handler";
import { contactNotice, contactReceipt } from "../lib/contact-submission";
import { sitemapResponse } from "../lib/sitemap-response";

const payload = {
  name: "Test Visitor",
  email: "visitor@example.test",
  subject: "Test project",
  message: "A private test brief",
  company: "",
};
const jsonRequest = (body: unknown = payload) =>
  new Request("https://www.promdevs.com/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const nativeRequest = (body = payload) =>
  new Request("https://www.promdevs.com/api/contact", {
    method: "POST",
    body: new URLSearchParams(body),
  });
const delivered = async () => Response.json({ message: "Delivered" });

test("contact JSON submissions preserve validated fields, attachments and private no-store responses", async () => {
  let calls = 0;
  const response = await handleContact(jsonRequest(), async (input) => {
    calls++;
    assert.equal(input.email, payload.email);
    assert.deepEqual(input.attachments, []);
    return delivered();
  });
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match((await response.json()).message, /has been sent/);
});

test("native contact sends POST data and redirects to a receipt without names, email or message in the URL", async () => {
  const response = await handleContact(nativeRequest(), delivered);
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get("location"),
    "/?view=html&contact=sent#contact",
  );
  for (const value of [payload.email, payload.name, payload.message])
    assert.ok(!response.headers.get("location")!.includes(value));
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("validation and honeypots reject submissions before delivery", async () => {
  let calls = 0;
  const send = async () => {
    calls++;
    return delivered();
  };
  assert.equal(
    (await handleContact(jsonRequest({ ...payload, email: "bad" }), send))
      .status,
    400,
  );
  const native = await handleContact(
    nativeRequest({ ...payload, company: "spam" }),
    send,
  );
  assert.equal(
    native.headers.get("location"),
    "/?view=html&contact=invalid#contact",
  );
  assert.equal(calls, 0);
});

test("delivery failures never become success and provider details never leak to visitors", async () => {
  for (const send of [
    async () => {
      throw new Error("private-provider-secret");
    },
    async () => new Response("<html>Bad gateway</html>", { status: 502 }),
    async () =>
      Response.json({ error: "private-provider-secret" }, { status: 500 }),
    async () => Response.json({}),
  ]) {
    const json = await handleContact(jsonRequest(), send);
    assert.equal(json.status, 503);
    assert.ok(!(await json.text()).includes("private-provider-secret"));
    const native = await handleContact(nativeRequest(), send);
    assert.equal(
      native.headers.get("location"),
      "/?view=html&contact=unavailable#contact",
    );
  }
});

test("rate limits preserve retry timing for JSON and native form submissions", async () => {
  const send = async () =>
    Response.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  const json = await handleContact(jsonRequest(), send);
  assert.equal(json.status, 429);
  assert.equal(json.headers.get("retry-after"), "60");
  const native = await handleContact(nativeRequest(), send);
  assert.equal(
    native.headers.get("location"),
    "/?view=html&contact=limited#contact",
  );
});

test("oversized native bodies and unsupported formats fail without delivery", async () => {
  let calls = 0;
  const send = async () => {
    calls++;
    return delivered();
  };
  const huge = await handleContact(
    nativeRequest({ ...payload, message: "x".repeat(80000) }),
    send,
  );
  assert.equal(
    huge.headers.get("location"),
    "/?view=html&contact=invalid#contact",
  );
  const text = new Request("https://example.test/api/contact", {
    method: "POST",
    body: "arbitrary text",
  });
  assert.equal((await handleContact(text, send)).status, 415);
  assert.equal(calls, 0);
});

test("receipt feedback accepts only known states and never displays query-string content", () => {
  assert.equal(contactReceipt("sent"), "sent");
  for (const value of ["<script>bad</script>", ["sent"], undefined, "unknown"])
    assert.equal(contactReceipt(value), undefined);
  assert.equal(contactNotice("sent").status, "success");
  assert.equal(contactNotice("unavailable").status, "error");
  assert.equal(contactNotice().status, "idle");
});

test("the sitemap retains all real URLs and responds with a retryable failure on an outage", async () => {
  const complete = await sitemapResponse(async () => [
    { slug: "real-product" },
    { slug: "second-product" },
  ]);
  assert.equal(complete.status, 200);
  const xml = await complete.text();
  assert.equal((xml.match(/<loc>/g) || []).length, 4);
  assert.ok(xml.includes("/projects/second-product"));
  const failed = await sitemapResponse(async () => {
    throw new Error("private-database-url");
  });
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("retry-after"), "60");
  assert.equal(failed.headers.get("cache-control"), "no-store");
  assert.ok(!(await failed.text()).includes("private-database-url"));
});

test("planned Client Stories page remains coming soon, and header has native navigation", async () => {
  const header = await readFile(
    new URL("../components/Header.tsx", import.meta.url),
    "utf8",
  );
  assert.match(header, /Client Stories<small className="nav-soon">Coming soon/);
  assert.match(header, /className="no-script-nav"/);
  const form = await readFile(
    new URL("../components/sections/Contact.tsx", import.meta.url),
    "utf8",
  );
  assert.match(form, /action="\/api\/contact"\s+method="post"/);
  const css = await readFile(
    new URL("../app/projects/projects.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.catalog-intro\s*\{[^}]*flex-direction: column/s);
  assert.doesNotMatch(css, /\.catalog-intro\s*\{[^}]*grid-template-columns/s);
});

test("tool labels stay inside their scroll container with JavaScript disabled", async () => {
  const css = await readFile(
    new URL("../components/sections/AITools.module.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.tool\s*\{[^}]*position: relative/s);
});

test("native forms support full-length international messages after URL encoding", async () => {
  const message = "好".repeat(5000);
  const response = await handleContact(
    nativeRequest({ ...payload, message }),
    async (input) => {
      assert.equal(input.message, message);
      return delivered();
    },
  );
  assert.equal(
    response.headers.get("location"),
    "/?view=html&contact=sent#contact",
  );
});
