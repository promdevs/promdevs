import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import {
  contactSchema,
  CONTACT_ATTACHMENT_BYTES,
  CONTACT_ATTACHMENT_COUNT,
  type ContactInput,
} from "@promdevs/contracts";
import { validateContactAttachments } from "../src/email/contact-attachments.js";
import { createApiServer } from "../src/server.js";
import { MemoryProjects, MemoryAuth } from "./fixtures.js";

const pdf = {
  filename: "brief.pdf",
  contentType: "application/pdf" as const,
  content: Buffer.from("%PDF-1.7\nTest brief").toString("base64"),
};
const contact = {
  name: "Visitor",
  email: "visitor@example.test",
  subject: "A product",
  message: "A test brief, not a real message.",
};

test("contact keeps no-attachment compatibility and bounds count, size, names and base64", () => {
  assert.deepEqual(contactSchema.parse(contact).attachments, []);
  assert.equal(
    contactSchema.safeParse({ ...contact, attachments: [pdf] }).success,
    true,
  );
  for (const attachment of [
    { ...pdf, filename: "../brief.pdf" },
    { ...pdf, filename: "brief.pdf\r\nBad" },
    { ...pdf, filename: "brief.exe" },
    { ...pdf, contentType: "text/html" },
    { ...pdf, content: "not base64!" },
    { ...pdf, content: "" },
  ])
    assert.equal(
      contactSchema.safeParse({ ...contact, attachments: [attachment] })
        .success,
      false,
    );
  assert.equal(
    contactSchema.safeParse({
      ...contact,
      attachments: Array(CONTACT_ATTACHMENT_COUNT + 1).fill(pdf),
    }).success,
    false,
  );
  const large = {
    ...pdf,
    content: Buffer.alloc(CONTACT_ATTACHMENT_BYTES + 1).toString("base64"),
  };
  assert.equal(
    contactSchema.safeParse({ ...contact, attachments: [large] }).success,
    false,
  );
  const half = {
    ...pdf,
    content: Buffer.alloc(CONTACT_ATTACHMENT_BYTES / 2 + 1).toString("base64"),
  };
  assert.equal(
    contactSchema.safeParse({ ...contact, attachments: [half, half] }).success,
    false,
  );
});

test("API rejects disguised files and accepts supported signatures with matching extensions", () => {
  validateContactAttachments([pdf]);
  validateContactAttachments([
    {
      filename: "shot.png",
      contentType: "image/png",
      content: Buffer.from("89504e470d0a1a0a", "hex").toString("base64"),
    },
  ]);
  validateContactAttachments([
    {
      filename: "shot.jpg",
      contentType: "image/jpeg",
      content: Buffer.from("ffd8ffe0", "hex").toString("base64"),
    },
  ]);
  validateContactAttachments([
    {
      filename: "shot.webp",
      contentType: "image/webp",
      content: Buffer.from("RIFF0000WEBPtest").toString("base64"),
    },
  ]);
  assert.throws(
    () =>
      validateContactAttachments([
        { ...pdf, content: Buffer.from("<html>bad</html>").toString("base64") },
      ]),
    /does not match/,
  );
  assert.throws(
    () => validateContactAttachments([{ ...pdf, filename: "shot.png" }]),
    /does not match/,
  );
  assert.throws(
    () => validateContactAttachments([{ ...pdf, contentType: "image/jpeg" }]),
    /does not match/,
  );
});

test("contact endpoint forwards valid attachments, rejects spoofed bytes, and reports provider failures", async () => {
  const deliveries: ContactInput[] = [];
  let fail = false;
  const server = createApiServer({
    store: new MemoryProjects(),
    authStore: new MemoryAuth(),
    adminOrigin: "https://admin.test",
    secureCookies: false,
    trustProxy: false,
    sendEmail: async (input) => {
      if (fail) throw new Error("Provider failed");
      deliveries.push(input);
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No listener");
  const submit = (body: unknown) =>
    fetch(`http://127.0.0.1:${address.port}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    // Over 64 KiB proves only contact received the expanded request budget.
    const largePdf = {
      ...pdf,
      content: Buffer.from("%PDF-1.7\n" + "x".repeat(70000)).toString("base64"),
    };
    assert.equal(
      (await submit({ ...contact, attachments: [largePdf] })).status,
      200,
    );
    assert.deepEqual(deliveries[0].attachments, [largePdf]);
    assert.equal(
      (
        await submit({
          ...contact,
          attachments: [
            { ...pdf, content: Buffer.from("bad").toString("base64") },
          ],
        })
      ).status,
      400,
    );
    assert.equal(
      (await submit({ ...contact, company: "spam", attachments: [pdf] }))
        .status,
      400,
    );
    assert.equal(deliveries.length, 1);
    fail = true;
    assert.equal(
      (await submit({ ...contact, attachments: [pdf] })).status,
      500,
    );
  } finally {
    server.close();
    server.closeAllConnections();
    await once(server, "close");
  }
});

test("Resend sends original bytes and missing configuration fails without logging visitor data", async (t) => {
  const { sendContactEmail } = await import("../src/email/resend.js");
  const previousKey = process.env.RESEND_API_KEY;
  const previousTo = process.env.CONTACT_TO_EMAIL;
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousTo === undefined) delete process.env.CONTACT_TO_EMAIL;
    else process.env.CONTACT_TO_EMAIL = previousTo;
  });
  process.env.RESEND_API_KEY = "re_fake_test_only";
  process.env.CONTACT_TO_EMAIL = "inbox@example.test";
  const outgoing: {
    attachments: unknown[];
    subject: string;
    reply_to: string;
  }[] = [];
  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init?: RequestInit) => {
      outgoing.push(JSON.parse(init?.body as string));
      return Response.json({ id: "test-email" });
    },
  );
  const payload = { ...contact, attachments: [pdf] };
  assert.deepEqual(await sendContactEmail(payload), {
    ok: true,
    fallback: false,
  });
  assert.deepEqual(outgoing[0].attachments, [
    {
      filename: pdf.filename,
      content: pdf.content,
      content_type: pdf.contentType,
    },
  ]);
  assert.equal(outgoing[0].subject, "[PromDevs Contact] A product");
  assert.equal(outgoing[0].reply_to, contact.email);
  delete process.env.RESEND_API_KEY;
  const logs: unknown[] = [];
  t.mock.method(console, "info", (...values: unknown[]) => {
    logs.push(values);
  });
  await assert.rejects(sendContactEmail(payload), (error: unknown) => {
    assert.equal((error as { status: number }).status, 503);
    assert.ok(!String(error).includes(contact.email));
    return true;
  });
  assert.deepEqual(logs, []);
  assert.equal(fetchMock.mock.callCount(), 1);
});
