import "../src/config.js";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { neon } from "@neondatabase/serverless";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@promdevs/contracts";
import { hashPassword } from "../src/auth.js";
import {
  OwnerBootstrapError,
  ownerBootstrapSql,
  ownerBootstrapStatements,
  validateOwnerDetails,
  validateOwnerPassword,
} from "../src/access-control/owner-bootstrap.js";

async function promptOwner() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new OwnerBootstrapError(
      "Run --apply in your own interactive terminal. Do not pipe passwords or pass them as arguments.",
    );
  }
  let muted = false;
  const controller = new AbortController();
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const terminal = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  terminal.on("SIGINT", () => controller.abort());
  terminal.on("close", () => controller.abort());
  const question = (label: string) =>
    terminal.question(label, { signal: controller.signal });
  const secret = async (label: string) => {
    process.stdout.write(label);
    muted = true;
    try {
      return await question("");
    } finally {
      muted = false;
      process.stdout.write("\n");
    }
  };
  try {
    const email = await question("Owner email: ");
    const name = await question("Owner display name: ");
    const details = validateOwnerDetails(email, name);
    const password = await secret(
      `New owner password (hidden, ${ADMIN_PASSWORD_MIN_LENGTH}-1024 characters): `,
    );
    const confirmation = await secret("Confirm password (hidden): ");
    validateOwnerPassword(password, confirmation);
    process.stdout.write(
      "This creates one active Owner and an audit record in the DATABASE_URL configured for this API.\n",
    );
    if (
      (await question(
        "Type CREATE OWNER to authorize this database write: ",
      )) !== "CREATE OWNER"
    ) {
      throw new OwnerBootstrapError("Cancelled. No account was created.");
    }
    return { ...details, passwordHash: await hashPassword(password) };
  } catch (error) {
    if (controller.signal.aborted)
      throw new OwnerBootstrapError("Cancelled. No account was created.");
    throw error;
  } finally {
    muted = false;
    terminal.close();
    output.destroy();
  }
}

async function seedOwner() {
  const [mode = "--check", ...extra] = process.argv.slice(2);
  if (!["--check", "--apply"].includes(mode) || extra.length) {
    throw new OwnerBootstrapError(
      "Usage: pnpm admin:seed-owner [--check|--apply]. No credentials are accepted as arguments.",
    );
  }
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new OwnerBootstrapError("Set DATABASE_URL in the API environment.");
  const query = neon(url);
  const [tables] = await query.query(ownerBootstrapSql.tables);
  if (!tables?.ready)
    throw new OwnerBootstrapError(
      "Admin tables are missing. Apply the reviewed admin schema migration first.",
    );
  const [state] = await query.query(ownerBootstrapSql.state);
  if (state.users !== 0 || state.bootstraps !== 0) {
    throw new OwnerBootstrapError(
      "Owner bootstrap is unavailable: accounts or a previous owner-bootstrap event already exist. Nothing was overwritten or promoted.",
    );
  }
  console.info("Admin schema is ready and first-owner bootstrap is available.");
  if (mode === "--check") {
    console.info(
      "Read-only check complete. No account or audit records were created.",
    );
    return;
  }
  const statements = ownerBootstrapStatements(await promptOwner());
  try {
    await query.transaction(
      statements.map(({ text, params }) => query.query(text, params)),
      { isolationLevel: "ReadCommitted" },
    );
  } catch {
    // A network failure can occur after commit. Do not claim that rollback definitely happened.
    throw new OwnerBootstrapError(
      "Owner bootstrap failed or could not be confirmed. Run --check before retrying; a commit may have completed. Existing accounts were never overwritten.",
    );
  }
  console.info(
    "Owner account and bootstrap audit record created atomically. No password or hash was printed.",
  );
  console.info(
    "Database login is ready for the seeded owner. Restart/deploy the API if it still runs the legacy authentication code.",
  );
}

seedOwner().catch((error: unknown) => {
  // Provider errors can contain SQL parameters or connection strings.
  console.error(
    error instanceof OwnerBootstrapError
      ? error.message
      : "Owner setup failed. Check API database access and migration state; credentials were not printed.",
  );
  process.exitCode = 1;
});
