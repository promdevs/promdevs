# Skills CSV Import

The supplied catalog was imported into the configured API database: 24 records,
IDs 1-24, with original names, slugs, icon URLs, categories, and timestamps.
The import found an empty skills table and no conflicts. All stored fields were
verified against the CSV after commit. The serial high-water mark is now 24.
No UI, migrations, project links, or other application records were changed.

## Repeat-Safe Command

Use the API-only `DATABASE_URL` configuration, Node.js 24, and pnpm 10.32.1.
From the repository root:

```sh
pnpm skills:import /absolute/path/skills.csv --dry-run
```

The default is read-only. After review and explicit authorization to import:

```sh
pnpm skills:import /absolute/path/skills.csv --apply
```

The file must have these exact columns, in order:

```text
id,name,slug,icon_url,category,created_at,updated_at
```

- Positive PostgreSQL integer IDs and valid unique slugs are required.
- Names/categories cannot be blank. Icons can be empty or safe HTTP/HTTPS URLs.
- Timestamps must be real calendar values without time-zone offsets, with up to
  six fractional digits. They are bound as timestamp strings, not converted to
  JavaScript Dates, so microseconds are preserved.
- Quotes, escaped quotes, commas, embedded newlines, BOM, and CRLF are supported.
- Duplicate IDs/slugs, malformed rows, and unknown/reordered headers are refused.
- Existing identical rows are skipped. Conflicting IDs, slugs, or stored values
  abort the import; there is no overwrite/upsert-update mode.
- Apply rechecks conflicts under a write lock before inserting, then verifies
  all incoming fields. The sequence only advances to at least the existing
  high-water mark/max ID; repeat imports cannot rewind it.
- The write lock has a ten-second timeout. The importer refuses unusual ID
  sequences (cycle enabled, increment not one, or cache not one).

Data insertion is transactional. The final `setval` sequence advancement is not
rolled back by PostgreSQL; a failed commit may leave a harmless ID gap. Do not
assume gapless IDs or consume a live `nextval` just to test the sequence.
If a network failure prevents verification, inspect the database/dry-run before
retrying; a successful retry retains identical rows rather than duplicating them.

The command never runs automatically during builds, startup, or deployment.
The CSV is not copied into the public repository, and tests do not depend on a
developer's Downloads directory. Database credentials and provider errors are
not printed by the importer.

Implementation: `apps/api/scripts/import-skills.ts` and
`apps/api/src/db/skills-import.ts`.
References: [Neon transactions](https://neon.com/docs/serverless/serverless-driver#issue-multiple-queries-with-the-transaction-function)
and [PostgreSQL sequences](https://www.postgresql.org/docs/current/functions-sequence.html).
