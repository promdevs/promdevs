import type { ContactAttachment } from "@promdevs/contracts";
import { HttpError } from "../errors.js";

// Do not trust the browser's MIME type or filename alone. Files are emailed only,
// never executed, parsed as documents, or published to a public bucket.
export function validateContactAttachments(files: ContactAttachment[]) {
  for (const file of files) {
    const bytes = Buffer.from(file.content, "base64");
    const type = file.contentType;
    const valid =
      bytes.toString("base64") === file.content &&
      ((type === "application/pdf" &&
        /\.pdf$/i.test(file.filename) &&
        bytes.subarray(0, 5).toString() === "%PDF-") ||
        (type === "image/png" &&
          /\.png$/i.test(file.filename) &&
          bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") ||
        (type === "image/jpeg" &&
          /\.jpe?g$/i.test(file.filename) &&
          bytes.subarray(0, 3).toString("hex") === "ffd8ff") ||
        (type === "image/webp" &&
          /\.webp$/i.test(file.filename) &&
          bytes.subarray(0, 4).toString() === "RIFF" &&
          bytes.subarray(8, 12).toString() === "WEBP"));
    if (!valid)
      throw new HttpError(
        400,
        "An attachment does not match its file type. Use PDF, PNG, JPG or WebP.",
      );
  }
}
