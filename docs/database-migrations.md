# Generate and Apply the Portfolio Schema

The schema now lives exclusively in `apps/api/src/db/schema.ts`. The old
`portfolio-schema.ts` and its separate config are no longer needed.
No live database changes were made by this work.

## Your Existing Empty Tables

Empty tables are not a new database. Do not delete migration history, manually
drop `projects`, use a fresh initial migration, or use `drizzle-kit push` to
bypass review. The current snapshots describe the old `projects` and demo table;
generation should produce an incremental change that preserves project IDs.

The repository history contains duplicate project creation and non-monotonic
journal timestamps. It cannot be safely replayed from scratch. An already
migrated database can proceed only when its recorded history matches and those
old creation statements will not run again. Empty application rows do not tell
us whether the migration history is correct.

## Steps

Use Node.js 24 and pnpm 10.32.1 from the repository root. Configure API-only
`DATABASE_URL` in `apps/api/.env` locally or the shell/Coolify environment. Never
put it in browser variables, committed files, or command arguments.

1. Take a database backup or snapshot, including table definitions and the
   migration journal, even if application tables contain no rows.
2. Check history without changing anything:

```sh
pnpm db:status
```

This only reads catalog metadata and recorded migrations. If it stops because
tables already exist but their baseline is not recorded, share its output
(omit secrets). We must establish the correct baseline from the actual schema
before applying changes. Do not insert made-up journal entries, change hashes,
or disable the check to force it through. A partial/unknown history also needs
review. The check does not read application record contents.

3. Generate migration files locally; this does not connect to or mutate the DB:

```sh
pnpm db:generate --name=portfolio_schema
```

This wrapper invokes Drizzle with the canonical config. It also fixes a known
incremental ordering issue: the new project composite UNIQUE must precede the
review foreign key that references it. Only newly generated SQL files can be
adjusted; previous migration files are never rewritten. Use this command instead
of invoking `drizzle-kit generate` directly, or manually review/fix that ordering.
Snapshots remain unchanged because the schema itself is unchanged by reordering.

If Drizzle asks whether a new table was created or renamed, choose **create
table** for clients, reviews, skills, contributors, and the join tables. Do not
rename `demo_users` into a real table. It should be dropped as an unused table.

4. Inspect the newly generated SQL in `apps/api/drizzle` and its snapshot/journal:

- It should create six new supporting tables and alter existing `projects`.
- It should drop `demo_users`, not `projects`, and should not recreate `projects`.
- Confirm all foreign keys, checks, defaults, and indexes are present.
- Confirm `projects_id_client_id_unique` is added before `reviews_project_client_fk`.
- A generated `DROP TABLE demo_users CASCADE` warrants dependency review; never
  assume CASCADE is harmless. The preflight stops if demo records or normal
  dependent objects are detected; database tooling should confirm dependencies.
- Do not accept unrelated drops or assume empty tables imply no dependent views.
- No client/profile permission fields or duplicate `show_review` are expected.
- No seed data or CSV imports should appear.

5. Test the reviewed migration against an isolated copy of the existing schema.
   The local preview was tested from the declared legacy baseline, not your
   live database. This does not prove live history or schema matches snapshots.
6. Check history again with the new migration present, then apply it yourself
   only after review/backup and if the preflight passes:

```sh
pnpm db:status
pnpm db:migrate
```

`db:migrate` runs the read-only preflight first. A failure prevents Drizzle from
running. Migrate applies SQL files and records them in the migration journal;
editing a TypeScript schema alone does not remove a live table. Do not run
`pnpm --filter @promdevs/api exec drizzle-kit migrate` directly to bypass safety.

7. Confirm the real schema in your database editor:

```sql
SELECT to_regclass('public.demo_users') AS demo_table;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT id, hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY id;
```

The demo-table result should be NULL. Expect `projects`, `clients`, `reviews`,
`skills`, `project_skills`, `contributors`, and `project_contributors`.
Then deploy/restart the updated API. Do not deploy it before migration: its
queries now refer to `publication_status` and will fail against the old schema.
No automatic Coolify/startup migrations are added.

## Content and Editor Limitations

Projects and reviews default to drafts. The current admin has no publication or
new-field editor yet; creating a project no longer automatically makes it public.
Do not publish by changing only `publication_status`: a project also needs its
required publication content and timestamp. Legacy web/admin responses still
need their existing complete fields; title-only drafts await the expanded editor.
No public pages, client profiles, reviews, or skill imports are introduced here.

References: [Drizzle generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
and [Drizzle migrate](https://orm.drizzle.team/docs/drizzle-kit-migrate).
