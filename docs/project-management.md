# Project Management

## Scope

API + admin only. The public website and its existing project contracts are
unchanged. No schema migration is introduced; the existing portfolio and admin
tables must already be applied. No live records or R2 objects are created by
builds/tests or startup.

The admin uses a full-page editor with explicit **Save draft**. Only a title is
required. Slugs, summaries, images, and case-study content can follow later.
There is no publishing action in this release. Published and archived projects
are read-only in this editor; owners/admins can restore archived records as drafts.

## Content and relationships

- Overview: title, optional slug/summary/category/year, work status, engagement,
  product types, platforms, industry, and optional client.
- Scope: contribution, starting point, delivered services, AI tools, tags, and
  catalog skills. Selected skills populate `project_skills`; their names derive
  the compatibility `tech_stack`. Legacy stack text is retained until catalog
  skills are selected, rather than silently erased by an unrelated edit.
- Story: problem, approach, solution, and results, with basic Markdown previews.
  Raw HTML, embedded images, iframes, and unsafe link protocols are excluded.
  Each field has a formatting toolbar, with Ctrl/Cmd+B and Ctrl/Cmd+I shortcuts.
  The expandable Markdown guide shows examples of supported syntax.
- Media: cover image, alt text, ordered gallery images/videos, captions, video
  posters, and social image. Uploads and external hosted URLs are supported.
- Links: live URL, App Store, Google Play, and source URL. The live URL is
  classified by destination; it does not silently change selected platforms.
- Timeline/team: internal dates, milestones, contributor roles, and notes.
  Elapsed duration is calculated from the start/end dates for future public use.
- Search/placement: SEO copy, social image, featured flag, and sort order.

Quick-create/select supports basic clients and contributors without full
management screens. These records are created immediately; their project links
are saved with the draft. Contributors are not administrator accounts.
`show_client` defaults to false and is independent of review visibility.
Archived clients/contributors can remain linked but cannot be newly assigned.

Project saves, link replacements, and audit entries are atomic. Updates and
archive/restore require `expectedUpdatedAt`; a stale save returns 409 without
overwriting newer work. Reloading latest deliberately discards local edits after
confirmation. Unsaved changes are not copied into browser storage.

## Permissions and API

Every endpoint requires an active database-backed session. Writes also require
the configured admin Origin. Owners, admins, and editors can create/edit drafts,
quick-create related records, and upload media. Only owners/admins can archive or
restore. The new editor does not hard-delete records or media.

| Endpoint under `/api/admin/portfolio` | Method | Purpose                                               |
| ------------------------------------- | ------ | ----------------------------------------------------- |
| `/options`                            | GET    | Skills, clients, and contributors                     |
| `/projects?q=&state=&limit=&offset=`  | GET    | Search, filter, and paginate summaries                |
| `/projects/:id`                       | GET    | Full administrative detail                            |
| `/projects`                           | POST   | Create a title-only or expanded draft                 |
| `/projects/:id`                       | PUT    | Save `{ project, expectedUpdatedAt }`                 |
| `/projects/:id/state`                 | POST   | `{ state: "draft" or "archived", expectedUpdatedAt }` |
| `/clients`                            | POST   | Quick-create a client                                 |
| `/contributors`                       | POST   | Quick-create a contributor                            |
| `/projects/:id/media`                 | POST   | Raw supported file bytes; matching Content-Type       |

New shared contracts are separate from legacy/public project payloads. Existing
`/api/admin/projects` compatibility endpoints retain their prior behavior and
permissions; the new editor does not use them. No publish endpoint is added.
New draft JSON requests have a 256 KiB limit; existing JSON endpoints remain
64 KiB. JSON bodies have a 15-second deadline. In-memory limits mean the API
should remain a single replica until shared limiting is introduced.

## Media prerequisites and limits

Configure R2 on the API only, including `R2_PUBLIC_BASE_URL`, following
[storage setup](storage.md). The admin sends bytes through its own `/api` proxy;
no browser R2 credentials, direct presigned upload, or new CORS policy is needed.
Save the draft before uploading. A successful upload still requires **Save draft**
to attach its URL. Progress, cancellation, and retry feedback are available.
Upload targets support drag-and-drop or file browsing, with feedback beside the
target. Cover images suggest 4:3 at 1600 x 1200px; social images suggest 1200 x
630px; gallery images suggest 4:3 or 16:9, and video 16:9 at 1920 x 1080px. These
are recommendations, not validation requirements. No cropping/resizing is applied.

- Images: JPEG, PNG, WebP, at most **10 MiB**.
- Video: MP4/H.264 with optional AAC, or WebM/VP8/VP9 with optional Opus/Vorbis,
  at most **50 MiB**, one visual stream, no additional data/subtitle tracks.
- Dimensions: at most 16,384px per side and 40 million pixels.
- The API requires `ffprobe` on PATH, provided by the `ffmpeg` package installed
  in `deploy/api.Dockerfile`. For local development, install ffmpeg separately.
  Missing ffprobe returns 503 instead of accepting uninspected files.
- Inspection checks signatures, codecs, dimensions, and video duration. It does
  not transcode, fully decode every frame, strip metadata, or provide malware
  scanning. Use web-ready, non-confidential assets.
- Files stream into private temporary files. At most two simultaneous uploads
  are admitted per API process. Per-user upload throttling also applies.
- External URLs are validated and stored, not downloaded by the API. Direct
  MP4/WebM URLs use native video controls; other providers open as links, not
  embedded players. HTTPS is required for previews in the production admin CSP.

**Uploaded URLs are public even when projects remain drafts.** Do not upload
private client documents or confidential artwork. Unlinking media, replacing a
cover, or archiving a project does not delete objects. Abandoned uploads can leave
orphans; there is no automatic garbage collector. Deletion must check reuse and
account for CDN caching. The API attempts compensating deletion when access is
invalidated during an upload, but cannot guarantee cleanup after network failures.

## Deployment and verification

1. Deploy API first with existing schema and R2 runtime variables. Verify
   `ffprobe -version` in its container. No new migration or seed is required.
2. Deploy admin with the updated Nginx template. Upload routes allow 50 MiB raw
   bodies and longer timeouts; normal API requests retain short proxy deadlines.
3. Verify login and draft workflows. Upload smoke tests against a development
   bucket are separate, explicitly authorized writes, not part of `storage:check`.

The new API/admin paths require both deployments. The public website does not
need rebuilding for this UI change, though shared-contract/lockfile watch paths
may still trigger its deployment. See [Coolify instructions](../deploy/COOLIFY.md).

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before deployment.
Tests use isolated auth/store/storage fixtures, not production services.

## Admin library screens

The admin now uses clean, directly loadable URLs: `/projects`, `/clients`,
`/reviews`, `/skills`, `/contributors`, `/users` (owner only), and `/security`.
Each library also supports `/new` and `/:id`. Old `#projects/:id` links redirect
on sign-in. Nginx's existing SPA fallback serves these deep links.

Projects use a compact thumbnail table with search, visibility filtering and
20/50/100-row pagination. The other libraries use the same list pattern.
Changes are explicitly saved; leaving a dirty editor prompts for confirmation.

The API endpoints are under `/api/admin/catalog/{clients,reviews,skills,contributors}`:

- `GET /` accepts `q`, `state`, `limit` (1–100), and `offset`.
- `GET /:id` returns the full authenticated record.
- `POST /` creates a record (reviews are always drafts).
- `PUT /:id` accepts `{ record, expectedUpdatedAt }` and rejects stale saves.
- `POST /:id/state` archives/restores clients, contributors, and draft reviews.
- `GET /api/admin/catalog/options` searches review relationships (`q`, optional
  `clientId`/`projectId`). Each list is capped at 100; saved selections are included.

All active roles can read and create records. Owners/admins manage existing
clients, contributors, and skills, because these are shared across projects.
Editors can edit draft reviews, but cannot archive or restore records. Every
write rechecks the live account and version in SQL and records an atomic audit.

Client contact information and notes remain internal. Client visibility on a
project is still controlled by `show_client`. Review identity is independently
controlled by `show_identity`, defaulting to false; reviews remain unpublished
in this release. Selecting both a project and client requires matching ownership.
Review text is plain text, not Markdown. Source/external-ID pairs are unique.

Skills retain their imported integer IDs. Their category/icon can be edited;
names and slugs are protected once linked to a project to avoid stale legacy
technology labels. No hard deletion or skill archive column has been introduced.
Clients/contributors use archiving to preserve existing relationships.
Logo/avatar/icon fields accept public HTTP(S) URLs; these screens do not upload
files or modify R2. Contributors are project people, not sign-in accounts.

Deploy the API before the admin, since the new screens require these endpoints.
No new migration, environment variable, dependency, or public-site change is
required. Tests and preview fixtures do not access the live database or R2.
