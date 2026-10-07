export const skillCsvHeaders = [
  "id",
  "name",
  "slug",
  "icon_url",
  "category",
  "created_at",
  "updated_at",
] as const;
export type SkillImportRow = {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  category: string;
  created_at: string;
  updated_at: string;
};

// Quoted CSV supports escaped quotes, commas, CRLF, and embedded newlines.
function csvRecords(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  source = source.replace(/^\uFEFF/, "");
  const endField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === ",") endField();
    else if (char === "\n" || char === "\r") {
      endField();
      rows.push(row);
      row = [];
      if (char === "\r" && source[i + 1] === "\n") i++;
    } else if (char === '"' && field === "" && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error("Malformed CSV quoting.");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (field || closed || row.length) {
    endField();
    rows.push(row);
  }
  return rows;
}

function validTimestamp(value: string): boolean {
  const match =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.\d{1,6})?$/.exec(value);
  if (!match) return false;
  const date = new Date(`${match[1]}T${match[2]}Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 19) === `${match[1]}T${match[2]}`
  );
}

export function parseSkillsCsv(source: string): SkillImportRow[] {
  if (source.length > 1024 * 1024 || source.includes("\0"))
    throw new Error("CSV is too large or contains NUL bytes.");
  const [header, ...records] = csvRecords(source);
  if (
    !header ||
    header.length !== skillCsvHeaders.length ||
    header.some((value, index) => value !== skillCsvHeaders[index])
  )
    throw new Error("CSV headers must match the skills schema exactly.");
  if (!records.length || records.length > 5000)
    throw new Error("CSV must contain 1-5000 skill records.");
  const ids = new Set<number>(),
    slugs = new Set<string>();
  return records.map((fields, index) => {
    const fail = () => {
      throw new Error(`Invalid or duplicate skill at CSV row ${index + 2}.`);
    };
    if (fields.length !== header.length) fail();
    const [rawId, name, slug, icon, category, created_at, updated_at] = fields;
    const id = Number(rawId);
    if (
      !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(id) ||
      id > 2147483647 ||
      !name.trim() ||
      !category.trim() ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
      ids.has(id) ||
      slugs.has(slug)
    )
      fail();
    if (!validTimestamp(created_at) || !validTimestamp(updated_at)) fail();
    if (icon) {
      try {
        const url = new URL(icon);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password ||
          /\s/.test(icon)
        )
          fail();
      } catch {
        fail();
      }
    }
    ids.add(id);
    slugs.add(slug);
    return {
      id,
      name,
      slug,
      icon_url: icon || null,
      category,
      created_at,
      updated_at,
    };
  });
}

const incoming = `SELECT * FROM jsonb_to_recordset($1::jsonb) AS i(
  id integer, name text, slug text, icon_url text, category text,
  created_at timestamp, updated_at timestamp
)`;
const mismatch = `s.id IS DISTINCT FROM i.id OR s.name IS DISTINCT FROM i.name
  OR s.slug IS DISTINCT FROM i.slug OR s.icon_url IS DISTINCT FROM i.icon_url
  OR s.category IS DISTINCT FROM i.category OR s.created_at IS DISTINCT FROM i.created_at
  OR s.updated_at IS DISTINCT FROM i.updated_at`;

export const skillsImportSql = {
  conflicts: `WITH incoming AS (${incoming}) SELECT i.id AS incoming_id, s.id AS existing_id
    FROM incoming i JOIN public.skills s ON s.id = i.id OR s.slug = i.slug
    WHERE ${mismatch}`,
  // Recheck under the write lock; a conflict aborts the transaction, never updates.
  assertNoConflicts: `WITH incoming AS (${incoming}) SELECT 1 / CASE WHEN EXISTS(
    SELECT 1 FROM incoming i JOIN public.skills s ON s.id = i.id OR s.slug = i.slug
    WHERE ${mismatch}) THEN 0 ELSE 1 END AS valid`,
  insert: `WITH incoming AS (${incoming}) INSERT INTO public.skills
    (id, name, slug, icon_url, category, created_at, updated_at)
    SELECT id, name, slug, icon_url, category, created_at, updated_at FROM incoming
    ON CONFLICT (id) DO NOTHING RETURNING id`,
  verify: `WITH incoming AS (${incoming}) SELECT 1 / CASE WHEN EXISTS(
    SELECT 1 FROM incoming i LEFT JOIN public.skills s ON s.id = i.id
    WHERE ${mismatch}) THEN 0 ELSE 1 END AS valid`,
  sequence: `SELECT setval(pg_get_serial_sequence('public.skills', 'id'), GREATEST(
    (SELECT coalesce(max(id), 1) FROM public.skills),
    (SELECT coalesce(last_value, 1) FROM pg_sequences WHERE schemaname = 'public'
      AND sequencename = (SELECT relname FROM pg_class
        WHERE oid = pg_get_serial_sequence('public.skills', 'id')::regclass))
    ), true) AS sequence_value`,
};
