import { execFile } from "node:child_process";
import { mkdtemp, open, rm, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage } from "node:http";
import {
  MAX_PROJECT_IMAGE_BYTES,
  MAX_PROJECT_VIDEO_BYTES,
  type ProjectUpload,
} from "@promdevs/contracts";
import { HttpError } from "../errors.js";
import { getR2Storage } from "./r2.js";
import { readR2Config, StorageError } from "./config.js";
import { validateImage } from "./policy.js";

export type TempMedia = {
  path: string;
  contentType: string;
  type: "image" | "video";
  size: number;
  cleanup: () => Promise<void>;
};
export type MediaUploader = {
  ready: () => void;
  upload: (file: TempMedia) => Promise<ProjectUpload>;
  remove: (key: string) => Promise<void>;
};
const types: Record<string, "image" | "video"> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
};
export async function receiveProjectMedia(
  request: IncomingMessage,
): Promise<TempMedia> {
  const contentType = String(request.headers["content-type"] || "").split(
    ";",
  )[0];
  const type = types[contentType];
  if (!type) {
    request.resume();
    throw new HttpError(
      415,
      "Upload JPEG, PNG, WebP, MP4, or WebM bytes directly.",
    );
  }
  const max =
    type === "image" ? MAX_PROJECT_IMAGE_BYTES : MAX_PROJECT_VIDEO_BYTES;
  if (Number(request.headers["content-length"]) > max) {
    request.resume();
    throw new HttpError(
      413,
      `Use images up to 10 MiB and videos up to 50 MiB.`,
    );
  }
  const directory = await mkdtemp(join(tmpdir(), "promdevs-upload-"));
  const path = join(directory, "media");
  const file = await open(path, "wx", 0o600);
  const cleanup = () => rm(directory, { recursive: true, force: true });
  let size = 0;
  const timer = setTimeout(() => request.destroy(), 180000);
  timer.unref();
  try {
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
      size += chunk.length;
      if (size > max) {
        request.resume();
        throw new HttpError(
          413,
          "Use images up to 10 MiB and videos up to 50 MiB.",
        );
      }
      await file.write(chunk);
    }
    if (!size) throw new HttpError(400, "Choose a nonempty file.");
    return { path, contentType, type, size, cleanup };
  } catch (error) {
    await cleanup();
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "The upload was interrupted. Try again.");
  } finally {
    clearTimeout(timer);
    await file.close();
  }
}
export function validateProbe(
  contentType: string,
  result: {
    streams?: {
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
    }[];
    format?: { duration?: string };
  },
) {
  const streams = result.streams || [];
  const video = streams.filter((s) => s.codec_type === "video");
  if (
    video.length !== 1 ||
    !video[0].width ||
    !video[0].height ||
    video[0].width > 16384 ||
    video[0].height > 16384 ||
    video[0].width * video[0].height > 40000000
  )
    throw new HttpError(
      400,
      "Use a valid image or single-track video with supported dimensions.",
    );
  const allowed: Record<string, string[]> = {
    "image/jpeg": ["mjpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "video/mp4": ["h264"],
    "video/webm": ["vp8", "vp9"],
  };
  if (!allowed[contentType]?.includes(video[0].codec_name || ""))
    throw new HttpError(
      400,
      "Use JPEG/PNG/WebP, MP4 with H.264, or WebM with VP8/VP9.",
    );
  if (contentType.startsWith("video/")) {
    const duration = Number(result.format?.duration);
    if (!Number.isFinite(duration) || duration <= 0)
      throw new HttpError(400, "Video duration could not be verified.");
    if (
      streams.some(
        (s) =>
          s.codec_type !== "video" &&
          (s.codec_type !== "audio" ||
            !(
              contentType === "video/mp4" ? ["aac"] : ["opus", "vorbis"]
            ).includes(s.codec_name || "")),
      )
    )
      throw new HttpError(
        400,
        "Use a video without extra data/subtitle tracks and with AAC (MP4) or Opus/Vorbis (WebM) audio.",
      );
  }
  return { width: video[0].width, height: video[0].height };
}
export async function probeProjectMedia(path: string, contentType: string) {
  const args = [
    "-v",
    "error",
    "-protocol_whitelist",
    "file",
    "-format_whitelist",
    "mov,matroska,webm,image2,png_pipe,jpeg_pipe,webp_pipe",
    "-show_entries",
    "stream=codec_type,codec_name,width,height:format=duration",
    "-of",
    "json",
    path,
  ];
  const output = await new Promise<string>((resolve, reject) =>
    execFile(
      "ffprobe",
      args,
      { timeout: 10000, maxBuffer: 65536, windowsHide: true },
      (error, stdout) => {
        if (error)
          reject(
            new HttpError(
              (error as NodeJS.ErrnoException).code === "ENOENT" ? 503 : 400,
              (error as NodeJS.ErrnoException).code === "ENOENT"
                ? "Media inspection is unavailable. Install ffprobe on the API host."
                : "This file could not be inspected. Use a valid supported image or video.",
            ),
          );
        else resolve(stdout);
      },
    ),
  );
  try {
    return validateProbe(contentType, JSON.parse(output));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid media file.");
  }
}
export const projectMediaUploader: MediaUploader = {
  ready() {
    const config = readR2Config();
    if (!config?.publicBaseUrl)
      throw new StorageError(
        "configuration",
        "Configure R2 and R2_PUBLIC_BASE_URL before uploading project media.",
      );
  },
  async upload(file) {
    if (file.type === "image")
      validateImage(await readFile(file.path), file.contentType);
    else {
      const handle = await open(file.path, "r");
      const head = Buffer.alloc(32);
      try {
        await handle.read(head, 0, 32, 0);
      } finally {
        await handle.close();
      }
      if (
        file.contentType === "video/mp4"
          ? head.toString("ascii", 4, 8) !== "ftyp"
          : !head.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"))
      )
        throw new HttpError(
          400,
          "The file does not match its video content type.",
        );
    }
    const dimensions = await probeProjectMedia(file.path, file.contentType);
    const storage = getR2Storage();
    const videoBody =
      file.type === "video" ? createReadStream(file.path) : null;
    try {
      const result =
        file.type === "image"
          ? await storage.uploadImage({
              scope: "projects",
              body: await readFile(file.path),
              contentType: file.contentType,
            })
          : await storage.uploadVideo({
              body: videoBody!,
              size: file.size,
              contentType: file.contentType as "video/mp4" | "video/webm",
            });
      if (!result.url)
        throw new StorageError(
          "configuration",
          "A public media domain is required.",
        );
      return {
        type: file.type,
        src: result.url,
        key: result.key,
        contentType: file.contentType,
        size: file.size,
        ...dimensions,
      };
    } finally {
      videoBody?.destroy();
      storage.destroy();
    }
  },
  async remove(key) {
    const storage = getR2Storage();
    try {
      await storage.deleteProjectMedia(key);
    } finally {
      storage.destroy();
    }
  },
};
