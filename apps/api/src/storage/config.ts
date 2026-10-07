export class StorageError extends Error {
  constructor(
    public readonly kind: "configuration" | "input" | "provider",
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string | null;
};

const required = [
  "R2_ENDPOINT",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
] as const;

function httpsOrigin(value: string, variable: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new StorageError(
      "configuration",
      `${variable} must be an HTTPS origin.`,
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    value.includes("?") ||
    value.includes("#") ||
    /\s/.test(value)
  ) {
    throw new StorageError(
      "configuration",
      `${variable} must be an HTTPS origin without a path or credentials.`,
    );
  }
  return url;
}

// Pure configuration parsing: importing this module never connects to R2.
export function readR2Config(
  env: NodeJS.ProcessEnv = process.env,
): R2Config | null {
  const values = required.map((name) => env[name]?.trim() || "");
  const publicBase = env.R2_PUBLIC_BASE_URL?.trim() || "";
  if (!values.some(Boolean) && !publicBase) return null;
  const missing = required.filter((_, index) => !values[index]);
  if (missing.length) {
    throw new StorageError(
      "configuration",
      `Incomplete R2 configuration. Set ${missing.join(", ")}.`,
    );
  }
  const [endpoint, bucket, accessKeyId, secretAccessKey] = values;
  const url = httpsOrigin(endpoint, "R2_ENDPOINT");
  if (
    !/^[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(
      url.hostname,
    )
  ) {
    throw new StorageError(
      "configuration",
      "R2_ENDPOINT must be the account's R2 S3 API endpoint.",
    );
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new StorageError(
      "configuration",
      "R2_BUCKET must be a valid bucket name (3-63 lowercase letters, digits, or hyphens).",
    );
  }
  if (/\s/.test(accessKeyId) || /\s/.test(secretAccessKey)) {
    throw new StorageError(
      "configuration",
      "R2 credentials must not contain whitespace.",
    );
  }
  const publicUrl = publicBase
    ? httpsOrigin(publicBase, "R2_PUBLIC_BASE_URL")
    : null;
  if (publicUrl?.hostname.endsWith(".r2.cloudflarestorage.com")) {
    throw new StorageError(
      "configuration",
      "R2_PUBLIC_BASE_URL must be a public media domain, not the S3 API endpoint.",
    );
  }
  return {
    endpoint: url.origin,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: publicUrl?.origin ?? null,
  };
}
