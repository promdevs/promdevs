import { randomUUID } from "node:crypto";
import { StorageError } from "./config.js";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const mediaScopes = [
  "projects",
  "clients",
  "reviews",
  "skills",
] as const;
export type MediaScope = (typeof mediaScopes)[number];
export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

const extensions: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Signature checking is not a full image decode or a malware scan.
export function validateImage(
  body: Buffer,
  contentType: string,
): ImageContentType {
  if (
    !Buffer.isBuffer(body) ||
    body.length === 0 ||
    body.length > MAX_IMAGE_BYTES
  ) {
    throw new StorageError(
      "input",
      "Provide an image between 1 byte and 10 MiB.",
    );
  }
  let detected: ImageContentType | undefined;
  if (
    body.length >= 24 &&
    body.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
    body.toString("ascii", 12, 16) === "IHDR"
  )
    detected = "image/png";
  else if (
    body.length >= 4 &&
    body[0] === 0xff &&
    body[1] === 0xd8 &&
    body[2] === 0xff &&
    body[body.length - 2] === 0xff &&
    body[body.length - 1] === 0xd9
  )
    detected = "image/jpeg";
  else if (
    body.length >= 20 &&
    body.toString("ascii", 0, 4) === "RIFF" &&
    body.toString("ascii", 8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(body.toString("ascii", 12, 16)) &&
    body.readUInt32LE(4) === body.length - 8
  )
    detected = "image/webp";
  if (!detected || detected !== contentType) {
    throw new StorageError(
      "input",
      "Use a JPEG, PNG, or WebP image with a matching content type.",
    );
  }
  return detected;
}

export function createImageKey(
  scope: MediaScope,
  contentType: ImageContentType,
): string {
  if (!mediaScopes.includes(scope) || !Object.hasOwn(extensions, contentType)) {
    throw new StorageError("input", "Invalid image scope or content type.");
  }
  return `images/${scope}/${randomUUID()}.${extensions[contentType]}`;
}

export function assertImageKey(key: string): void {
  if (
    !/^images\/(projects|clients|reviews|skills)\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(jpg|png|webp)$/.test(
      key,
    )
  ) {
    throw new StorageError("input", "Invalid managed image key.");
  }
}
