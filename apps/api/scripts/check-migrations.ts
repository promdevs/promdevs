import "../src/config.js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import {
  assessMigrationState,
  type AppliedMigration,
} from "../src/db/migration-safety.js";

// Read-only preflight. Never create, modify, or baseline migration records here.
async function checkMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Set DATABASE_URL in the API environment before checking or migrating.",
    );
    process.exitCode = 1;
    return;
  }
  const journal = JSON.parse(
    await readFile(resolve("drizzle/meta/_journal.json"), "utf8"),
  ) as {
    entries: { tag: string; when: number }[];
  };
  const files = await Promise.all(
    journal.entries.map(async (entry) => {
      if (
        !/^[a-zA-Z0-9_-]+$/.test(entry.tag) ||
        !Number.isSafeInteger(entry.when)
      )
        throw new Error("Invalid journal");
      const sql = await readFile(
        resolve("drizzle", `${entry.tag}.sql`),
        "utf8",
      );
      return {
        ...entry,
        sql,
        hash: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
  const query = neon(url);
  const tables = await query.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  );
  const [history] = await query.query(
    "SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS present",
  );
  const records = history.present
    ? await query.query(
        "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC",
      )
    : [];
  const applied: AppliedMigration[] = records.map((row) => {
    if (
      typeof row.hash !== "string" ||
      !Number.isSafeInteger(Number(row.created_at))
    )
      throw new Error("Invalid recorded history");
    return { hash: row.hash, created_at: Number(row.created_at) };
  });
  const names = tables.map((row) => String(row.table_name));
  const assessment = assessMigrationState(files, applied, names);
  const dropsDemo = assessment.pending.some((file) =>
    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?"demo_users"/i.test(file.sql),
  );
  if (dropsDemo && names.includes("demo_users")) {
    const [row] = await query.query(
      "SELECT count(*)::int AS count FROM public.demo_users",
    );
    if (row.count > 0)
      assessment.issues.push(
        "demo_users contains records. Back up and explicitly review deletion before proceeding.",
      );
    const [dependencies] = await query.query(
      "SELECT count(*)::int AS count FROM pg_depend WHERE refobjid = 'public.demo_users'::regclass AND deptype = 'n'",
    );
    if (dependencies.count > 0)
      assessment.issues.push(
        "demo_users has dependent objects. Review the DROP TABLE and its dependencies before proceeding.",
      );
  }
  console.info("Public tables:", names.join(", ") || "none");
  console.info("Recorded migrations:", applied.length);
  console.info(
    "Pending migrations:",
    assessment.pending.map((file) => file.tag).join(", ") || "none",
  );
  if (assessment.issues.length) {
    for (const issue of assessment.issues) console.error(issue);
    console.error(
      "Stopped before migration. This check did not change the database.",
    );
    process.exitCode = 1;
  } else {
    console.info(
      "History preflight passed. Review pending SQL and take a backup before migration.",
    );
  }
}

checkMigrations().catch(() => {
  // Provider errors can contain connection details; never print them verbatim.
  console.error(
    "Read-only migration check failed. Check database access and migration files. No migrations were run.",
  );
  process.exitCode = 1;
});
