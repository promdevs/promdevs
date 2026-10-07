import "../src/config.js";
import { readR2Config, StorageError } from "../src/storage/config.js";
import { createR2Storage } from "../src/storage/r2.js";

async function checkStorage() {
  const config = readR2Config();
  if (!config) {
    console.error(
      "R2 is not configured. Follow docs/storage.md and set the API-only R2 variables.",
    );
    process.exitCode = 1;
    return;
  }
  const storage = createR2Storage(config);
  try {
    await storage.checkBucket();
    console.info("R2 bucket connection passed (read-only HEAD request).");
    console.info(
      config.publicBaseUrl
        ? "Public media URL is configured; public access and DNS have not been tested."
        : "No public media URL is configured. Public URLs will not be generated.",
    );
    console.info(
      "No objects were uploaded, deleted, or listed. Write permission was not tested.",
    );
  } finally {
    storage.destroy();
  }
}

checkStorage().catch((error: unknown) => {
  console.error(
    error instanceof StorageError
      ? error.message
      : "Storage check failed. Check the API storage configuration.",
  );
  process.exitCode = 1;
});
