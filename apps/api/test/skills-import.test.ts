import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSkillsCsv,
  skillCsvHeaders,
  skillsImportSql,
} from "../src/db/skills-import.js";

const encode = (fields: string[]) =>
  fields.map((field) => `"${field.replaceAll('"', '""')}"`).join(",");
const header = encode([...skillCsvHeaders]);
const fields = [
  "1",
  "TypeScript",
  "typescript",
  "https://example.test/icon.svg",
  "Frontend",
  "2026-03-15 12:06:45.62124",
  "2026-03-16 16:08:57.734",
];
const file = (...rows: string[][]) =>
  [header, ...rows.map(encode)].join("\r\n");

test("CSV preserves IDs, microseconds, and supplied values without requiring a trailing newline", () => {
  const [row] = parseSkillsCsv(file(fields));
  assert.equal(row.id, 1);
  assert.equal(row.created_at, fields[5]);
  assert.equal(row.updated_at, fields[6]);
  assert.equal(row.icon_url, fields[3]);
});
test("quoted CSV handles BOM, escaped quotes, embedded commas/newlines, and empty icons", () => {
  const row = [...fields];
  row[1] = 'A, "quoted"\nname';
  row[3] = "";
  const [parsed] = parseSkillsCsv(`\uFEFF${file(row)}\r\n`);
  assert.equal(parsed.name, row[1]);
  assert.equal(parsed.icon_url, null);
});
test("duplicate IDs/slugs and malformed quoting/columns abort before database access", () => {
  assert.throws(() => parseSkillsCsv(file(fields, fields)), /duplicate/);
  assert.throws(
    () => parseSkillsCsv(file(fields, ["2", ...fields.slice(1)])),
    /duplicate/,
  );
  assert.throws(() => parseSkillsCsv(file(fields.slice(0, 6))), /Invalid/);
  assert.throws(() => parseSkillsCsv(`${header}\n"1`), /quote/);
  assert.throws(() => parseSkillsCsv(`${header}\n"1"extra`), /quoting/);
  assert.throws(
    () => parseSkillsCsv(file(fields).replace('"id","name"', '"id,name"')),
    /headers/,
  );
});
test("invalid IDs, blank labels, unsafe URLs, slugs, and impossible dates are rejected", () => {
  for (const [column, value] of [
    [0, "0"],
    [0, "1e2"],
    [0, "2147483648"],
    [1, "  "],
    [2, "Bad Slug"],
    [3, "javascript:alert(1)"],
    [3, "https://user:pass@example.test/icon.svg"],
    [4, ""],
    [5, "2026-02-31 12:00:00"],
    [6, "2026-03-15 24:00:00"],
    [5, "2026-03-15 12:00:00.1234567"],
  ] as const) {
    const row = [...fields];
    row[column] = value;
    assert.throws(() => parseSkillsCsv(file(row)), /Invalid/);
  }
  assert.throws(() => parseSkillsCsv(header), /records/);
  assert.throws(() => parseSkillsCsv(file(fields) + "\0"), /NUL/);
});
test("SQL imports bind CSV data, skip identical IDs, and never overwrite existing records", () => {
  for (const query of [
    skillsImportSql.conflicts,
    skillsImportSql.assertNoConflicts,
    skillsImportSql.insert,
    skillsImportSql.verify,
  ])
    assert.match(query, /\$1::jsonb/);
  assert.match(skillsImportSql.insert, /ON CONFLICT \(id\) DO NOTHING/);
  assert.doesNotMatch(skillsImportSql.insert, /DO UPDATE/);
  assert.match(skillsImportSql.assertNoConflicts, /s\.slug = i\.slug/);
  assert.match(skillsImportSql.sequence, /GREATEST/);
  assert.match(skillsImportSql.sequence, /last_value/);
});
