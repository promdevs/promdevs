import assert from "node:assert/strict";
import test from "node:test";
import {
  attachmentSelectionError,
  encodeContactAttachments,
} from "../lib/contact-attachments";

const pdf = () =>
  new File(["%PDF-1.7\nA brief"], "brief.pdf", { type: "application/pdf" });
test("optional files allow empty selection and encode original bytes for delivery", async () => {
  assert.equal(attachmentSelectionError([]), null);
  assert.deepEqual(await encodeContactAttachments([]), []);
  const [file] = await encodeContactAttachments([pdf()]);
  assert.equal(file.filename, "brief.pdf");
  assert.equal(file.contentType, "application/pdf");
  assert.equal(
    Buffer.from(file.content, "base64").toString(),
    "%PDF-1.7\nA brief",
  );
});
test("the attachment picker validates file count, combined size, empty files and unsupported formats", () => {
  assert.match(
    attachmentSelectionError([pdf(), pdf(), pdf(), pdf()])!,
    /up to 3/,
  );
  assert.match(
    attachmentSelectionError([
      new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.pdf", {
        type: "application/pdf",
      }),
    ])!,
    /3 MB/,
  );
  assert.match(
    attachmentSelectionError([
      new File([], "empty.pdf", { type: "application/pdf" }),
    ])!,
    /non-empty/,
  );
  assert.match(
    attachmentSelectionError([
      new File(["bad"], "bad.exe", { type: "application/pdf" }),
    ])!,
    /PDF/,
  );
  assert.match(
    attachmentSelectionError([
      new File(["bad"], "image.svg", { type: "image/svg+xml" }),
    ])!,
    /PDF/,
  );
});
