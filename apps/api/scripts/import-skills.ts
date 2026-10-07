import "../src/config.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { parseSkillsCsv, skillsImportSql } from "../src/db/skills-import.js";

class ImportFailure extends Error {}

async function importSkills() {
  const [path, mode = "--dry-run", ...extra] = process.argv.slice(2);
  if (!path || !["--dry-run", "--apply"].includes(mode) || extra.length)
    throw new ImportFailure(
      "Usage: skills:import <CSV path> [--dry-run|--apply]",
    );
  const source = await readFile(resolve(path), "utf8").catch(() => {
    throw new ImportFailure("Unable to read the supplied skills CSV.");
  });
  let rows;
  try {
    rows = parseSkillsCsv(source);
  } catch (error) {
    throw new ImportFailure(
      error instanceof Error ? error.message : "Invalid skills CSV.",
    );
  }
  console.info(
    `Validated ${rows.length} skills; IDs ${Math.min(...rows.map((row) => row.id))}-${Math.max(...rows.map((row) => row.id))}.`,
  );
  const url = process.env.DATABASE_URL;
  if (!url) throw new ImportFailure("Set DATABASE_URL in the API environment.");
  const query = neon(url);
  const [ready] = await query.query(
    "SELECT to_regclass('public.skills') IS NOT NULL AS present",
  );
  if (!ready.present)
    throw new ImportFailure(
      "The skills table is missing. Apply the reviewed schema migration first.",
    );
  const payload = JSON.stringify(rows);
  const conflicts = await query.query(skillsImportSql.conflicts, [payload]);
  if (conflicts.length)
    throw new ImportFailure(
      `Import refused: ${conflicts.length} conflicting ID/slug matches. Existing records were not changed.`,
    );
  const [counts] = await query.query(
    "SELECT count(*)::int AS total, count(*) FILTER (WHERE id = ANY($1::int[]))::int AS matching_ids FROM public.skills",
    [rows.map((row) => row.id)],
  );
  const [sequence] = await query.query(
    "SELECT seqincrement, seqcache, seqcycle FROM pg_sequence WHERE seqrelid = pg_get_serial_sequence('public.skills', 'id')::regclass",
  );
  if (
    !sequence ||
    Number(sequence.seqincrement) !== 1 ||
    Number(sequence.seqcache) !== 1 ||
    sequence.seqcycle
  )
    throw new ImportFailure(
      "The skills ID sequence differs from the expected non-cycling, increment-one/cache-one serial sequence. Review it before importing.",
    );
  console.info(
    `Database has ${counts.total} skills; ${counts.matching_ids} incoming records already match.`,
  );
  if (mode !== "--apply") {
    console.info("Dry run complete. No data or sequence changes made.");
    return;
  }
  const results = await query.transaction(
    [
      query.query("SET LOCAL lock_timeout = '10s'"),
      query.query("LOCK TABLE public.skills IN SHARE ROW EXCLUSIVE MODE"),
      query.query(skillsImportSql.assertNoConflicts, [payload]),
      query.query(skillsImportSql.insert, [payload]),
      query.query(skillsImportSql.verify, [payload]),
      // setval is last: row checks must pass before advancing the non-transactional sequence.
      query.query(skillsImportSql.sequence),
    ],
    { isolationLevel: "ReadCommitted" },
  );
  await query.query(skillsImportSql.verify, [payload]);
  console.info(
    `Import verified: ${results[3].length} inserted, ${rows.length - results[3].length} identical records retained. Sequence high-water mark: ${results[5][0].sequence_value}.`,
  );
}

importSkills().catch((error: unknown) => {
  // Never print provider errors, SQL payloads, or connection strings.
  const safe =
    error instanceof ImportFailure
      ? error.message
      : "Database import failed or could not be verified. No existing records were overwritten; check database access/state before retrying.";
  console.error(safe);
  process.exitCode = 1;
});
