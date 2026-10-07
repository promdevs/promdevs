import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { readR2Config, StorageError, type R2Config } from "./config.js";
import {
  assertImageKey,
  createImageKey,
  validateImage,
  type MediaScope,
} from "./policy.js";

type StorageCommand =
  | PutObjectCommand
  | HeadObjectCommand
  | HeadBucketCommand
  | DeleteObjectCommand;
type StorageResponse = {
  ContentLength?: number;
  ContentType?: string;
  ETag?: string;
  $metadata?: { httpStatusCode?: number };
};

// A narrow transport seam keeps tests isolated from real credentials and buckets.
export type StorageTransport = {
  send(
    command: StorageCommand,
    options?: { abortSignal?: AbortSignal },
  ): Promise<StorageResponse>;
  destroy(): void;
};

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    requestHandler: { connectionTimeout: 5000, requestTimeout: 60000 },
  });
}

export function createR2Storage(
  config: R2Config,
  transport: StorageTransport = createR2Client(config),
) {
  const publicUrl = (key: string): string | null => {
    assertImageKey(key);
    return config.publicBaseUrl ? `${config.publicBaseUrl}/${key}` : null;
  };
  const send = async (
    command: StorageCommand,
    timeout = 20000,
  ): Promise<StorageResponse> => {
    try {
      return await transport.send(command, {
        abortSignal: AbortSignal.timeout(timeout),
      });
    } catch {
      // SDK errors may contain endpoints, signed requests, or credentials.
      throw new StorageError(
        "provider",
        "R2 request failed. Check bucket access and API storage configuration.",
      );
    }
  };

  return {
    publicUrl,
    async uploadVideo(input: {
      body: Readable;
      size: number;
      contentType: "video/mp4" | "video/webm";
    }) {
      if (
        !config.publicBaseUrl ||
        !Number.isSafeInteger(input.size) ||
        input.size < 1 ||
        input.size > 50 * 1024 * 1024 ||
        !["video/mp4", "video/webm"].includes(input.contentType)
      )
        throw new StorageError(
          "input",
          "A public media domain and supported video up to 50 MiB are required.",
        );
      const key = `videos/projects/${randomUUID()}.${input.contentType === "video/mp4" ? "mp4" : "webm"}`;
      await send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: input.body,
          ContentType: input.contentType,
          ContentLength: input.size,
          IfNoneMatch: "*",
          CacheControl: "public, max-age=31536000, immutable",
          ContentDisposition: "inline",
        }),
        60000,
      );
      return { key, url: `${config.publicBaseUrl}/${key}` };
    },
    async deleteProjectMedia(key: string) {
      if (
        !/^videos\/projects\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(mp4|webm)$/.test(
          key,
        )
      )
        assertImageKey(key);
      await send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
    async checkBucket(): Promise<void> {
      await send(new HeadBucketCommand({ Bucket: config.bucket }));
    },
    async uploadImage(input: {
      scope: MediaScope;
      body: Buffer;
      contentType: string;
    }) {
      const contentType = validateImage(input.body, input.contentType);
      const key = createImageKey(input.scope, contentType);
      const result = await send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: input.body,
          ContentType: contentType,
          ContentLength: input.body.length,
          // Fresh UUID keys are immutable. A retry must not overwrite an existing object.
          IfNoneMatch: "*",
          CacheControl: config.publicBaseUrl
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
          ContentDisposition: "inline",
        }),
      );
      return {
        key,
        url: publicUrl(key),
        contentType,
        size: input.body.length,
        etag: result.ETag ?? null,
      };
    },
    async inspectImage(key: string) {
      assertImageKey(key);
      const result = await send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      return {
        key,
        url: publicUrl(key),
        contentType: result.ContentType ?? null,
        size: result.ContentLength ?? null,
        etag: result.ETag ?? null,
      };
    },
    async deleteImage(key: string): Promise<void> {
      assertImageKey(key);
      await send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
    destroy() {
      transport.destroy();
    },
  };
}

// Lazy and optional: the website/API can start and build without storage secrets.
export function getR2Storage() {
  const config = readR2Config();
  if (!config)
    throw new StorageError("configuration", "R2 storage is not configured.");
  return createR2Storage(config);
}
