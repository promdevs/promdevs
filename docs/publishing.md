# Publishing projects and reviews

## Admin workflow

1. Open a project or review, complete its content, and **Save draft**.
2. Review **Website visibility**, its missing-fields checklist, and identity settings.
3. An owner/admin clicks **Publish**, confirms, and receives a published status.
4. To change a published record, **Unpublish** first, edit/save, then republish.

Save is never Publish. Unsaved or incomplete records cannot be published from the
admin. Editors can create/edit drafts but cannot publish or unpublish. Archived
records must be restored from the list first; published records must be
unpublished before archiving. Failed or stale requests do not change data.

Projects require a slug, description, product type, cover image, and cover alt
text. Client linkage, live links, case-study Markdown, year, and skills are not
required. Reviews require a linked client and nonblank body. Title, rating,
project linkage, and named author identity are optional. Store launch approvals
and review scores are never invented.

Publication uses the saved record, a locked row/version check, the live active
owner/admin role and auth version, same-origin protection, and an atomic audit.
The server sets `published_at` on publish and clears it on unpublish. Audit events
retain publication history; the API cannot accept a caller-supplied timestamp.

## API

Authenticated POST endpoints accept `{ "state": "published" | "draft" | "archived",
"expectedUpdatedAt": "<current version>" }`:

- `/api/admin/portfolio/projects/:id/state`
- `/api/admin/catalog/reviews/:id/state`

`draft` on a published record means Unpublish; on an archived record it means
Restore. Invalid transitions/stale versions return 409; missing content returns
400 with the fields to complete; missing/insufficient authentication returns
401/403. Publication never enables `show_client` or `show_identity`.

Public read endpoints require no admin session:

- `GET /api/portfolio/projects` returns summaries and `total`, `limit`, `offset`.
- `GET /api/portfolio/projects/:slug` returns one full public project, or 404.
- `GET /api/portfolio/reviews` returns reviews and `total`, `limit`, `offset`.

Lists accept `limit` (1–100, default 20), `offset` (default 0), and optional
`featured=true` or `featured=false`. Lower sort values appear first, before
pagination; featured status only breaks ties. There is no public status filter.
Drafts and archived records never appear, including via direct slug requests.

Responses use explicit allowlists, not administrative records. Public project
details contain case-study content, media, skills and links. They omit client IDs,
private contact fields, contributors/internal team notes, and the full timeline.
Only the derived duration is public. Client details appear only when Show client
is enabled **and the linked client has a Public name**. Internal names are never
used as a fallback; client contact person/email/phone/notes are not public.

Review author name, role, company, and avatar appear only when Show author
identity is enabled; otherwise `author` is null. This is independent of project
Show client. A review's project link is returned only if that project is also
published. Internal notes, external import IDs, and client IDs are never returned.
Markdown is content, not trusted HTML: future website consumers must keep raw HTML
and unsafe embeds disabled.

The existing `/api/projects` compatibility API is unchanged. It requires legacy
category/year/stack fields and may omit otherwise publish-ready newer projects.
Use the new `/api/portfolio/*` endpoints when building the upcoming website sections.
No public website UI, cache invalidation webhook, or revalidation secret was added.
API responses use `Cache-Control: no-store`; future website caching must refresh
on unpublish. Previously cached pages, screenshots, and R2 asset URLs cannot be
retracted merely by unpublishing a database record. Do not upload confidential media.

## Deployment and verification

Deploy the API first, then admin. There is no new migration for this workflow;
the existing portfolio/access-control schema must already be applied. No live
record is automatically published or unpublished during deployment/startup.

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. HTTP/browser
verification uses isolated records; SQL validation uses an in-memory PostgreSQL
engine. Live database migrations and live publication are separate explicit actions.
