import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { readR2Config, StorageError } from "../src/storage/config.js";
import {
  MAX_IMAGE_BYTES,
  assertImageKey,
  createImageKey,
  validateImage,
} from "../src/storage/policy.js";
import {
  createR2Client,
  createR2Storage,
  type StorageTransport,
} from "../src/storage/r2.js";

// Explicit fake configuration; never read .env or contact a real bucket in tests.
const env = {
  R2_ENDPOINT: `https://${"a".repeat(32)}.r2.cloudflarestorage.com`,
  R2_BUCKET: "test-media",
  R2_ACCESS_KEY_ID: "test-access-key",
  R2_SECRET_ACCESS_KEY: "test-secret-key",
  R2_PUBLIC_BASE_URL: "https://media.example.test/",
};
const config = readR2Config(env)!;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG9sAAAAASUVORK5CYII=",
  "base64",
);
const key = "images/projects/12345678-1234-4234-8234-123456789012.png";

function mockTransport() {
  const commands: Parameters<StorageTransport["send"]>[0][] = [];
  let destroyed = false;
  const transport: StorageTransport = {
    async send(command, options) {
      assert.ok(options?.abortSignal);
      commands.push(command);
      return {
        ETag: '"test-etag"',
        ContentLength: png.length,
        ContentType: "image/png",
      };
    },
    destroy() {
      destroyed = true;
    },
  };
  return { commands, transport, isDestroyed: () => destroyed };
}

test("storage is optional; partial configuration fails without leaking values", () => {
  assert.equal(readR2Config({}), null);
  assert.equal(readR2Config({ R2_ENDPOINT: " ", R2_BUCKET: "" }), null);
  assert.throws(
    () => readR2Config({ R2_SECRET_ACCESS_KEY: "secret-not-for-output" }),
    (error) => {
      assert.ok(error instanceof StorageError);
      assert.match(error.message, /Incomplete R2 configuration/);
      assert.ok(!error.message.includes("secret-not-for-output"));
      return true;
    },
  );
  assert.throws(
    () => readR2Config({ R2_PUBLIC_BASE_URL: env.R2_PUBLIC_BASE_URL }),
    StorageError,
  );
});

test("R2 configuration distinguishes S3 endpoints from public media domains", () => {
  assert.equal(config.publicBaseUrl, "https://media.example.test");
  for (const jurisdiction of ["", ".eu", ".us", ".fedramp"]) {
    const endpoint = `https://${"a".repeat(32)}${jurisdiction}.r2.cloudflarestorage.com`;
    assert.equal(
      readR2Config({ ...env, R2_ENDPOINT: endpoint })?.endpoint,
      endpoint,
    );
  }
  for (const endpoint of [
    "http://localhost:9000",
    "https://media.example.test",
    env.R2_ENDPOINT + "/bucket",
    env.R2_ENDPOINT + "?token=secret",
    env.R2_ENDPOINT + "?",
    env.R2_ENDPOINT + "#",
    "https://user:password@" + new URL(env.R2_ENDPOINT).host,
  ]) {
    assert.throws(
      () => readR2Config({ ...env, R2_ENDPOINT: endpoint }),
      StorageError,
    );
  }
  for (const publicBase of [
    env.R2_ENDPOINT,
    "javascript:alert(1)",
    "https://media.example.test/path",
    "https://media.example.test/?signature=secret",
  ]) {
    assert.throws(
      () => readR2Config({ ...env, R2_PUBLIC_BASE_URL: publicBase }),
      StorageError,
    );
  }
  for (const bucket of ["ab", "../other-bucket", "UPPERCASE", "a".repeat(64)]) {
    assert.throws(
      () => readR2Config({ ...env, R2_BUCKET: bucket }),
      StorageError,
    );
  }
  assert.throws(
    () => readR2Config({ ...env, R2_ACCESS_KEY_ID: "has spaces" }),
    StorageError,
  );
});

test("SDK uses R2 region, explicit credentials, bounded retries and compatible checksums", async () => {
  const client = createR2Client(config);
  try {
    assert.equal(await client.config.region(), "auto");
    assert.equal(
      (await client.config.credentials()).accessKeyId,
      "test-access-key",
    );
    assert.equal(client.config.forcePathStyle, true);
    assert.equal(await client.config.maxAttempts(), 2);
    assert.equal(
      await client.config.requestChecksumCalculation(),
      "WHEN_REQUIRED",
    );
    assert.equal(
      await client.config.responseChecksumValidation(),
      "WHEN_REQUIRED",
    );
  } finally {
    client.destroy();
  }
});

test("image policy validates bytes and declared type, and rejects active file formats", () => {
  assert.equal(validateImage(png, "image/png"), "image/png");
  const jpegSignature = Buffer.from("ffd8ffffd9", "hex");
  assert.equal(validateImage(jpegSignature, "image/jpeg"), "image/jpeg");
  const webpSignature = Buffer.alloc(24);
  webpSignature.write("RIFF", 0);
  webpSignature.writeUInt32LE(webpSignature.length - 8, 4);
  webpSignature.write("WEBPVP8 ", 8);
  assert.equal(validateImage(webpSignature, "image/webp"), "image/webp");
  for (const [body, type] of [
    [png, "image/jpeg"],
    [png, "image/svg+xml"],
    [Buffer.from("<svg><script>alert(1)</script></svg>"), "image/png"],
    [Buffer.from("<html>not an image</html>"), "image/png"],
    [Buffer.alloc(0), "image/png"],
    [Buffer.alloc(MAX_IMAGE_BYTES + 1), "image/png"],
    [png.subarray(0, 8), "image/png"],
  ] as const)
    assert.throws(() => validateImage(body, type), StorageError);
  webpSignature.writeUInt32LE(0, 4);
  assert.throws(() => validateImage(webpSignature, "image/webp"), StorageError);
});

test("object keys are unique, managed, and cannot inject paths or URLs", () => {
  const keys = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const generated = createImageKey("projects", "image/jpeg");
    assertImageKey(generated);
    assert.ok(generated.endsWith(".jpg"));
    keys.add(generated);
  }
  assert.equal(keys.size, 30);
  for (const invalid of [
    "../secret",
    key + "?token=x",
    "/" + key,
    "https://media.example.test/" + key,
    key.replace("projects", "private"),
    key.replace(".png", ".svg"),
  ]) {
    assert.throws(() => assertImageKey(invalid), StorageError);
  }
  assert.throws(
    () => createImageKey("../private" as "projects", "image/png"),
    StorageError,
  );
  assert.throws(
    () => createImageKey("projects", "toString" as "image/png"),
    StorageError,
  );
});

test("readiness checks only HEAD the configured bucket and clean up transport", async () => {
  const fake = mockTransport();
  const storage = createR2Storage(config, fake.transport);
  await storage.checkBucket();
  assert.equal(fake.commands.length, 1);
  assert.ok(fake.commands[0] instanceof HeadBucketCommand);
  assert.deepEqual(fake.commands[0].input, { Bucket: "test-media" });
  storage.destroy();
  assert.ok(fake.isDestroyed());
});

test("uploads have matching metadata, immutable keys, and no caller filename", async () => {
  const fake = mockTransport();
  const storage = createR2Storage(config, fake.transport);
  const image = await storage.uploadImage({
    scope: "clients",
    body: png,
    contentType: "image/png",
  });
  assertImageKey(image.key);
  assert.match(image.key, /^images\/clients\//);
  assert.equal(image.url, `https://media.example.test/${image.key}`);
  assert.equal(image.etag, '"test-etag"');
  assert.equal(image.size, png.length);
  const command = fake.commands[0];
  assert.ok(command instanceof PutObjectCommand);
  assert.deepEqual(command.input, {
    Bucket: "test-media",
    Key: image.key,
    Body: png,
    ContentType: "image/png",
    ContentLength: png.length,
    IfNoneMatch: "*",
    ContentDisposition: "inline",
    CacheControl: "public, max-age=31536000, immutable",
  });
  await assert.rejects(
    storage.uploadImage({
      scope: "clients",
      body: png,
      contentType: "text/html",
    }),
    StorageError,
  );
  assert.equal(fake.commands.length, 1);
});

test("without a media domain, helpers return no public URL or public cache directive", async () => {
  const fake = mockTransport();
  const storage = createR2Storage(
    { ...config, publicBaseUrl: null },
    fake.transport,
  );
  assert.equal(storage.publicUrl(key), null);
  const image = await storage.uploadImage({
    scope: "reviews",
    body: png,
    contentType: "image/png",
  });
  assert.equal(image.url, null);
  assert.equal(
    (fake.commands[0] as PutObjectCommand).input.CacheControl,
    "private, no-store",
  );
});

test("inspect and deletion are restricted to managed keys and the configured bucket", async () => {
  const fake = mockTransport();
  const storage = createR2Storage(config, fake.transport);
  const info = await storage.inspectImage(key);
  assert.equal(info.size, png.length);
  assert.equal(info.contentType, "image/png");
  await storage.deleteImage(key);
  assert.ok(fake.commands[0] instanceof HeadObjectCommand);
  assert.ok(fake.commands[1] instanceof DeleteObjectCommand);
  for (const command of fake.commands)
    assert.deepEqual(command.input, { Bucket: "test-media", Key: key });
  await assert.rejects(storage.deleteImage("../../private"), StorageError);
  await assert.rejects(
    storage.inspectImage("https://untrusted.example/image.png"),
    StorageError,
  );
  assert.equal(fake.commands.length, 2);
});

test("provider errors are redacted for every operation", async () => {
  const storage = createR2Storage(config, {
    async send() {
      throw new Error("secret-test-credential signed-query database-details");
    },
    destroy() {},
  });
  for (const operation of [
    () => storage.checkBucket(),
    () => storage.inspectImage(key),
    () => storage.deleteImage(key),
    () =>
      storage.uploadImage({
        scope: "projects",
        body: png,
        contentType: "image/png",
      }),
  ]) {
    await assert.rejects(operation(), (error) => {
      assert.ok(error instanceof StorageError);
      assert.equal(error.kind, "provider");
      assert.ok(!error.message.includes("secret-test-credential"));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});
