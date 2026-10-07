# Portfolio Database Schema

Status: the portfolio definitions are the canonical API schema. The user applied
the migration separately; the supplied skills CSV has now been imported and
verified. No admin or website page changes were made. Apply the reviewed
migration before deploying this API code to any other environment.

## Files and Activation Boundary

- `apps/api/src/db/schema.ts`: Single canonical schema, relations, and inferred types.
- `apps/api/drizzle.config.ts`: Main generation/migration config. Generation
  works offline; migration requires API-only `DATABASE_URL`.
- `apps/api/scripts/check-migrations.ts`: Read-only history/dependency preflight.
- `apps/api/test/portfolio-schema.test.ts`: Schema, publication, and response-boundary tests.

`portfolio-schema.ts` and the temporary portfolio config have been removed.
The API now selects/returns an explicit legacy field allowlist instead of
spreading whole rows. Public project reads require published status. Private
client references, exact timeline data, and contributor information do not leak.

The unchanged website/admin contract still requires a slug, year, category,
summary, and technology list. Incomplete title-only drafts remain valid database
records but are not returned by the legacy catalog. No placeholder year/slug is
invented. The current editor creates drafts, cannot edit new fields or publish,
and cannot manage incomplete drafts yet. Expanded contracts/editor work is a
separate next step; project/client/review identity display is not wired to pages.

## Tables

| Table | Purpose |
| --- | --- |
| `projects` | One portfolio collection for work and case studies; optional client relationship. |
| `clients` | Individuals/organizations with private contacts and reusable public display details. |
| `reviews` | Feedback, optional five-point ratings, publication status, and independent identity display. |
| `skills` | Catalog matching the supplied CSV and its integer IDs. |
| `project_skills` | Many-to-many skill links with a composite primary key and display order. |
| `contributors` | Internal people, not administrator accounts. |
| `project_contributors` | Internal assignments with a composite primary key, role, and notes. |

The unused `demo_users` definition is removed from the canonical schema. Historical
migrations/snapshots remain intact, and no live table has been dropped. A future
generated migration may propose dropping that table; review and authorize it
before applying. Referenced records use restricted deletion, not cascading
history removal. Prefer archiving clients/contributors.

A review linked to both a project and client must match the project's client.
A composite foreign key also blocks project reassignment while attributed
reviews remain linked. Deliberately review/unlink history before reassignment.

## Project Fields

| Group | Database columns |
| --- | --- |
| Identity | `id`, `title`, `slug`, `description`, `category`, `engagement_type`, `product_types`, `platforms`, `industry`, `year` |
| Context | `client_id`, `show_client`, `role_summary`, `services`, `starting_point`, `built_with`, `tech_stack`, `tags` |
| Story | `problem`, `approach`, `solution`, `results` |
| Media | `cover_image`, `cover_alt`, `gallery` |
| Destinations | `live_url`, `app_store_url`, `play_store_url`, `github_url` |
| Internal schedule | `timeline` |
| Publication | `status`, `publication_status`, `featured`, `sort_order`, `published_at` |
| Search | `seo_title`, `seo_description`, `social_image` |
| Audit | `created_at`, `updated_at` |

`status` retains the legacy work status: `in_progress`, `completed`, or `ongoing`.
Separate `publication_status` values are `draft`, `published`, and `archived`.
Only a title is required as draft input; other mandatory fields have defaults.
Published projects also require a slug, nonblank summary, product type, cover
with alt text, and publication timestamp. Year/category are not mandatory draft
inputs. There is no separate Works or Case Studies table.

Optional `services` and `built_with` arrays use extensible stable keys; future
API validation can manage the choices without a database enum migration per new
tool/service. `features` was not selected and is not implemented. There is no
duplicate `capabilities` column.

Markdown source stays text in `problem`, `approach`, `solution`, and `results`.
A future renderer must disable raw HTML, sanitize links, and use plain text in
metadata. No Markdown rendering behavior is changed here.

`gallery` is an ordered JSONB image/video array: `type`, `src`, and optional
`alt`, `caption`, `width`, `height`, and `poster`. Database checks enforce basic
shape. Future request validation must check optional properties, media paths,
dimensions, and image accessibility as well.

## Timeline and Links

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-02-26",
  "milestones": [{ "label": "Launch", "date": "2026-02-26" }]
}
```

Timeline is optional; individual dates may be unknown. Use SQL NULL for no
timeline, not JSON `null`. Checks enforce known top-level fields, valid overall
calendar dates, ordered bounds, and milestone label/date format. Future API
validation must also check actual milestone calendar dates and nested unknown
fields. Exact dates/milestones remain private. Expose only a derived duration
later: this example is 56 elapsed days, or **8 weeks**. Missing dates produce no
fabricated duration. Do not store a duplicate duration or sum overlapping phases.

HTTP/HTTPS destination checks reject unsafe protocols and URL credentials.
Dedicated store fields require recognized Apple/Google app-listing URLs. Later,
classify a lone `live_url` using its parsed hostname/path/query, prefer explicit
store URLs, and avoid duplicate buttons. This schema does not activate that UI.
Explicit `platforms` selections are not inferred from store links; `built_with`
describes development tools, not whether the product itself is AI.

## Clients and Reviews

Clients have internal `name`, `client_type`, `public_name`, `industry`,
`website_url`, `logo`, private `contact_name`,
`contact_email`, `contact_phone`, `notes`, `status`, and audit timestamps.

Reviews have `client_id`, optional `project_id`, `title`, `body`, optional
`rating`, `reviewed_at`, author attribution snapshots, `source`, `source_url`,
`external_id`, `show_identity`,
`publication_status`, `featured`, `sort_order`, private `internal_notes`, and
audit/publication timestamps.

- `projects.show_client` defaults to false and controls client display only on
  that project's public detail page. There is no global profile permission field
  or standalone public client directory. Linking a client does not display it.
- Review visibility uses `publication_status`, not a duplicate `show_review`:
  published is visible; draft/archived are hidden. A missing review shows nothing.
  Publication requires a client, nonblank body, and `published_at`; featuring
  only affects placement. Publish is the administrator's deliberate decision.
- `reviews.show_identity` defaults to false. A published review can be anonymous
  even when its client is visible on a project, or named when project
  `show_client` is false. These switches never override each other.
- Named reviews require nonblank `author_name` attribution. Use the review's
  author snapshots, never an automatic fallback to private client/contact data.
  In anonymous mode, the eventual public response must omit author name, role,
  company, avatar, client identity, external IDs, source links, and identifying
  project links. Render a neutral label such as **Anonymous client**; never use
  an internal client ID as the public identity. Public review IDs must not encode
  the client's identity. Stored attribution may remain available privately.
- Inspect review text/title before anonymous publication: it may itself identify
  the client. Hiding fields does not automatically anonymize a quotation; leave
  it unpublished until suitable wording is agreed. A publicly attributable
  project elsewhere also limits what anonymity can reasonably promise.
- Optional ratings range from 1 to 5 with two decimal places; unrated reviews
  must not count as zero-star reviews.
- Source keys are extensible (for example `direct`, `contra`, `upwork`). External
  IDs are unique within their source, not across providers.
- Counts/averages must later derive from eligible actual reviews, independently
  of featured placement. No totals or verified badges are stored.
- These constraints do not replace public allowlists. Private contacts, names,
  and internal notes must never be returned publicly. Recording agreement
  context in private notes does not require a separate permission workflow.

Removed fields: `clients.public_profile_permission`,
`reviews.publication_permission`, and `reviews.permission_record`. No
`allow_public_profile`, `show_review`, or client-wide review switch is added.
One review may be public while another from the same client remains private.
These client/review rules remain planned public response behavior; only the
legacy project allowlist and publication filtering are wired into the API.

## Supplied Skills CSV

Reviewed 24 records with IDs 1-24 and these columns:

```text
id,name,slug,icon_url,category,created_at,updated_at
```

The schema matches those fields, explicit integer IDs, unique slugs, and the
supplied Frontend, Backend, DevOps, Database, and Integration categories.
Categories remain extensible text. All 24 supplied records have been imported
and verified with their IDs and timestamp precision preserved. The serial
high-water mark was advanced to 24. The CSV was not copied into the repository;
tests do not depend on the Downloads file. See [import instructions](skills-import.md).

`project_skills` uses `project_id`, `skill_id`, and nonnegative `sort_order`.
Linked catalog entries should become the technology source of truth during API
integration. Retain legacy `tech_stack` until its backfill/compatibility is
reviewed; do not create two independently editable technology lists.

## Timestamps and Rollout

Existing project creation time and CSV skill timestamps remain timestamp without
time zone. New audit/publication fields use timestamp with time zone. Do not
reinterpret historical timestamps without a reviewed policy. `updated_at` uses
Drizzle's `$onUpdate`, not a database trigger; imports/direct SQL must supply it.

Validation: lint, TypeScript, 37 tests, and production build passed. Generated
DDL also passed isolated in-memory PostgreSQL checks, including 46 rejected
invalid writes. No live connection or repository dependency was needed.
The user generated/applied the migration separately. This agent's migration
verification used temporary local files and an isolated database, not a live
migration. The skills import was subsequently authorized and applied live.
See [migration instructions](database-migrations.md) for the sequence. Existing migration history is
preserved, including its inconsistencies; the preflight refuses unsafe replay
instead of silently baselining or rewriting records.

Later work: expand request/response
contracts and editor support, implement client/review identity filtering, store
link classification and public duration, then build the new admin/public pages.

Editable checklists: [Projects](projects-schema-plan.md) and
[Clients and reviews](clients-reviews-schema-plan.md).
