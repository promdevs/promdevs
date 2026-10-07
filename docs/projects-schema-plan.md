# Projects Schema Plan

Status: selected fields now live in the canonical API schema. The user applied
the migration separately, and the skills catalog has been imported. No UI
changes were made; API reads use publication filtering and an
explicit legacy allowlist. See [implementation details](database-schema.md). Original checklist
selections remain editable; unchecked `features` has not been implemented.

Use `projects` as the single portfolio collection. Projects, Our Work, and case
studies are presentation labels, not separate collections in this proposal.

## How to Review

- Check a field to keep it: change `[ ]` to `[x]`.
- Delete fields you do not need, or mark them "Later".
- Edit names, purposes, types, and rules freely.
- Unchecked fields are undecided, not automatically rejected.
- This file is a planning document, not an executable database schema.

## Identity and Context

- [x] `id` (integer): Stable identifier; preserve existing project IDs.
- [x] `title` (text): Public project or product name.
- [x] `slug` (unique text): URL identifier, such as `/projects/product-name`.
- [x] `description` (text): Concise summary for portfolio cards and page introductions.
- [x] `engagement_type` (controlled value): Client work, collaboration, or PromDevs product.
- [x] `product_types` (text array): Website, web app, mobile app, AI product; multiple allowed.
- [x] `platforms` (optional controlled-value array): Platforms the product supports, such as web, iOS, Android, macOS, Windows, or Linux; multiple allowed.
- [x] `industry` (optional text): Industry context.
- [x] `client_id` (nullable foreign key to `clients.id`): Optional client relationship; a project can exist without a client.
- [x] `role_summary` (optional text): What PromDevs contributed.
- [x] `year` (integer): Public project year.

Keep `description` as the database name to preserve the existing field; label it
**Project summary** in the admin.

`product_types` describes what the product is; `platforms` describes where it
runs. Neither is the same as `built_with`, which describes AI development tools.
A store link alone must not overwrite the selected platforms: an App Store
listing, for example, need not be an iPhone-only product.

The client relationship replaces the proposed `client_display_name` field on
projects. Approved public names belong to the client record. Linking a client
internally does not automatically authorize displaying their identity publicly.

Review notes:

## Scope and Story

- [x] `services` (optional controlled-value text array, default empty): Work PromDevs delivered, such as frontend development, backend development, product design, app rescue, QA, or deployment.
- [ ] `features` (optional text array): Short product highlights, such as authentication, search, or API integrations; suggested from the screenshot, pending selection.
- [x] `starting_point` (optional controlled value): Idea, prototype, AI-generated build, unfinished product, or established product.
- [x] `tech_stack` (text array): Technologies used.
- [x] `built_with` (optional controlled-value array, default empty): AI platforms or development assistants used on the project, such as Replit, Lovable, Base44, Claude, or Codex. Multiple values are allowed.
- [x] `tags` (text array): Additional editorial/filtering labels.
- [x] `problem` (optional Markdown text): The challenge or opportunity.
- [x] `approach` (optional Markdown text): Important design and engineering decisions.
- [x] `solution` (optional Markdown text): What was built, improved, rescued, or migrated.
- [x] `results` (optional Markdown text): Supported outcomes; numerical claims are not required.

Preserve the existing `problem`, `solution`, and `results` fields. A short portfolio
entry can leave these blank; a case-study presentation uses them.

`built_with` describes the development process, not the product's functionality.
A web app built using Lovable is not automatically an AI product. Leave this field
empty when no AI platform/tool was used. Use stable keys for storage and readable
display labels; the final list remains editable during planning.

Skills are linked through `project_skills`, not a single `project_skills_id` column
on `projects`. See the relationships section below.

`tech_stack` remains selected for now; it has not been removed. Once the existing
skills catalog is integrated, decide whether to derive the technology stack from
linked skills rather than maintain duplicate editable data.

Services replace the proposed `capabilities` classification, avoiding duplicate
editable fields. Services are not required for saving or publishing a project.
The screenshot's `services` and `features` columns have different meanings:
services are work performed, while features are functionality delivered.

The public site's existing five capability groups remain unchanged. They can
guide service choices without becoming another independently stored project field:

- Product design & engineering
- Web, mobile & AI products
- Prototype to production
- Product rescue & migrations
- Quality & launch

Review notes:

## Relationships and Supporting Tables

These tables organize the same project collection; they do not create separate
Projects, Works, or Case Studies collections.

### Skills and Project Skills

- [x] `skills`: Match the supplied portfolio catalog; all 24 records are imported with original IDs and timestamps.
- [x] `project_skills`: Many-to-many relationship between projects and skills.

Proposed `project_skills` fields:

| Field | Purpose |
| --- | --- |
| `project_id` | Foreign key to `projects.id` |
| `skill_id` | Foreign key to `skills.id`; match the imported ID type |
| `sort_order` | Optional ordering of skills within the project |

Use the pair `(project_id, skill_id)` as the unique relationship. A separate join
row ID is not needed unless another feature needs to reference that row. One
project can have many skills, and one skill can appear on many projects.

The supplied CSV has been reviewed: integer IDs and `name`, `slug`, `icon_url`,
`category`, `created_at`, and `updated_at`. The schema matches it and preserves
explicit IDs; the 24-row catalog has now been imported and verified.

Recommendation, pending review: linked skills should be the source of truth.
If the catalog identifies technology skills, derive the displayed `tech_stack`
from those links. If not, decide whether to add a skill classification or retain
a separate technology list with a clearly different purpose. Do not require the
admin to enter the same technologies twice.

### Services: Optional List for the First Version

Services describe what the client engaged PromDevs to deliver. Skills describe
the expertise and technologies used. For example, Product rescue & migrations is
a service, while PostgreSQL is a technology skill.

Recommendation: keep `projects.services` as an optional controlled-value text
array for now. No dedicated `services` or `project_services` tables are needed
unless services later require their own managed descriptions, pages, or other
metadata. If that happens, move to a catalog and join table rather than retaining
two editable sources of truth. `features` remains a separate optional proposal.

### Internal Contributors

- [x] `contributors`: Internal people who worked on projects; recommended name instead of `builders`.
- [x] `project_contributors`: Many-to-many relationship between projects and contributors.

Proposed contributor fields for review: `id`, `name`, optional internal contact
details, active/archive state, and record timestamps. Contributor records are
not administrator accounts and do not grant login or API access.

Proposed `project_contributors` fields:

| Field | Purpose |
| --- | --- |
| `project_id` | Foreign key to `projects.id` |
| `contributor_id` | Foreign key to `contributors.id` |
| `role` | Optional contribution description, such as designer, engineer, or QA |
| `notes` | Optional internal contribution notes |

Use a unique `(project_id, contributor_id)` pair. This covers designers,
engineers, testers, and collaborators without calling every person a builder.
Assignments and internal contact details/notes are admin-only; public API
responses must explicitly exclude them. Detailed contributor fields remain
subject to review. This is attribution planning, not payroll or time tracking.

### Clients

Detailed field checklist: [Clients and reviews plan](clients-reviews-schema-plan.md).
That document retains the original client/review checklist. The approved schema
implementation is summarized in [database schema](database-schema.md).

- [x] `clients`: Dedicated client records, reusable across projects.
- [x] `projects.client_id`: Optional many-to-one relationship to a client.

One client can have multiple projects. This version assumes at most one linked
client per project; multi-client engagements would need a separate join table.

Suggested client fields for later review:

| Field | Purpose |
| --- | --- |
| `id` | Stable client identifier |
| `name` | Internal name of the person or organization |
| `client_type` | Optional distinction between individual and organization |
| `public_name` | Optional approved name for public display |
| `website_url` | Optional public website |
| `logo` | Optional approved logo reference |
| `contact_name` | Optional private contact person |
| `contact_email` | Optional private contact email |
| `notes` | Optional private relationship notes |
| `created_at`, `updated_at` | Record timestamps |

Client fields now have canonical definitions. Private contact details and notes must
never be included in public project responses. A linked client can remain hidden
on an individual project via `show_client` alone (false by default). There is no
global client profile permission; review visibility/identity are independent.
Prefer archiving clients over deleting relationship history.

### Reviews: Follow-up Planning

The review proposal is now available in the linked clients/reviews checklist for
selection. Definitions now follow the approved client/review proposal; this
section retains its original planning context.

Keep reviews as separate records rather than a single text/rating field on a
client or project. A client may provide more than one review over time.

Proposed relationship: `reviews.client_id` links to the client, and an optional
`reviews.project_id` links a review to a specific project. Where both are linked,
the review must relate to that project's client. Review content, author
attribution, source, optional rating/scale, independent identity display, and publication
status are defined in the canonical schema. Client/review APIs remain future work.

Do not treat an internal review as an approved public testimonial, or invent
ratings or rating totals. Reviews are schema-only until migration and integration
are separately authorized.

Review notes:

## Basic Markdown Support

Store Markdown as plain text in `problem`, `approach`, `solution`, and `results`.
Suggested supported formatting: paragraphs, bold, italic, lists, links, inline
code, code blocks, and subordinate headings. Keep titles, summaries, SEO fields,
and classification labels as plain text unless explicitly changed later.

The eventual renderer must escape or sanitize content, disable raw HTML/scripts,
and reject unsafe link protocols. Media should use the gallery rather than
arbitrary embedded HTML. The admin should provide a preview using the same rules
as the public website. Markdown source should not appear as raw syntax in metadata.

Review notes:

## Visuals and Links

- [x] `cover_image` (optional text): Main image's storage reference or URL.
- [x] `cover_alt` (optional text): Accessible description of the cover.
- [x] `gallery` (structured JSON): Ordered images/videos with captions and alt text.
- [x] `live_url` (optional URL): Public product or website.
- [x] `app_store_url` (optional URL): Direct public Apple App Store product listing.
- [x] `play_store_url` (optional URL): Direct public Google Play app listing.
- [x] `github_url` (optional URL): Public repository, only when appropriate.

Suggested gallery item properties: media type, source, optional dimensions,
caption, and contextual alt text. Videos can also have a poster image.

Store file references, not image/video binaries, in the database. A separate media
library can come later if reuse becomes important.

### Link Classification and Display

When only `live_url` is provided, derive the CTA type from the parsed URL without
requiring an extra stored classification field:

| Recognized URL | Presentation |
| --- | --- |
| Exact hostname `apps.apple.com` and a product path containing `/app/` and an `id` followed by digits | View on the App Store |
| Legacy exact hostname `itunes.apple.com` with an equivalent app listing path | View on the App Store |
| Exact hostname `play.google.com`, path `/store/apps/details`, and a nonempty `id` query parameter | View on Google Play |
| Other valid HTTP/HTTPS URLs | Visit website, or a neutral Visit product label for an ambiguous destination |

Official link references:
[Apple App Store links](https://developer.apple.com/news/?id=06142019a) and
[Google Play app links](https://developer.android.com/distribute/marketing-tools/linking-to-google-play).

Parse the actual hostname and path, not a substring of the URL. An unrelated
domain with `apps.apple.com` in its path or query is not an App Store link.
Reject unsafe schemes and URL credentials. Dedicated store fields must validate
as their matching product-listing URL type. This classification does not prove
that a listing is currently available or identify every supported platform.

Explicit `app_store_url` and `play_store_url` take precedence for their respective
buttons. Use a recognized store `live_url` as a fallback only when its dedicated
field is empty. Avoid duplicate buttons for the same normalized destination.
If both store fields and a normal website URL are supplied, all three links can
be shown. If `live_url` conflicts with an explicit link for the same store, flag
it in the admin rather than silently discarding the difference.

Shortened/custom redirect URLs cannot be reliably classified from the string
alone. Use a direct store URL in its dedicated field or show a neutral link;
do not fetch arbitrary URLs server-side just to guess their destination.

Review notes:

## Timeline

- [x] `timeline` (optional structured JSON): Private actual dates and milestone breakdown, used to calculate a public duration summary.

Proposed shape for review:

| Property | Purpose |
| --- | --- |
| `start_date` | Optional actual engagement start, as a calendar date |
| `end_date` | Optional actual completion date; blank for ongoing work |
| `milestones` | Optional ordered entries, each with a label and optional actual date |

Allow dates to be unknown. Require the end date to be on or after the start date
when both exist; validate milestone data rather than accepting arbitrary JSON.
Derive a duration from actual dates instead of maintaining an independently
editable duration that can disagree with them. Avoid mixing estimates into the
actual-date fields; planned schedules can be designed separately if needed.

### Public Duration, Private Breakdown

- [x] Show a derived duration such as **8 weeks** on the public project page.
- [x] Keep exact dates, milestone breakdown, and contributor details internal.
- [x] Calculate the duration from the timeline; do not add a separately editable duration column.

Use the actual overall `start_date` and `end_date` as the duration boundaries.
Calculate elapsed calendar days, then format the public summary: 56 days is
**8 weeks**. For shorter projects show days; if rounding a partial week, use
**About N weeks** rather than implying an exact duration. Do not sum overlapping
phases or milestones: design and engineering may happen in parallel. This
describes elapsed project time, not billable hours or active-work time.

Only show a completed duration when both actual boundaries are known and valid.
Otherwise omit it; do not invent an end date from the latest milestone or present
an ongoing project's elapsed time as its final delivery duration.

The API should derive a public `duration_days` value from the private timeline
and include only that summary in its public response. The website formats the
label. Exact dates and internal milestone details must be excluded server-side,
not merely hidden in the UI. `duration_days` is a computed response field, not
another editable database field. The admin may preview the public label.

The public `year` remains the editorial project year, not necessarily the year
the engagement began.

Review notes:

## Publishing and Presentation

- [x] `status` (controlled work-status value): In progress, completed, or ongoing; retains the existing physical column instead of introducing `work_status`.
- [x] `publication_status` (controlled value): Draft, published, or archived.
- [x] `featured` (boolean): Include in selected work.
- [x] `sort_order` (integer): Deliberate ordering within portfolio groups.
- [x] `seo_title` (optional text): Search/social title override.
- [x] `seo_description` (optional text): Search/social description override.
- [x] `social_image` (optional text): Social preview override; otherwise use the cover.
- [x] `created_at` (timestamp): Creation time.
- [x] `updated_at` (timestamp): Last edit.
- [x] `published_at` (optional timestamp): First publication time.

Separate work status from publication status. "Completed" must not automatically
mean "public". The schema retains `status` for work status and adds separate
`publication_status`; there is no duplicated or renamed work-status column.

Review notes:

## Proposed Admin Editor

1. **Overview:** Identity, summary, product platforms, optional client selection, linked skills, AI platforms, optional services, and scope.
2. **Story:** Starting point, challenge, approach, solution, and outcomes with Markdown preview.
3. **Media:** Cover, ordered gallery, website link, and App Store/Google Play links with destination previews.
4. **Publish:** Visibility, featured placement, ordering, links, and SEO.

Internal timeline and contributor assignment controls should be clearly separated
from public content editing. Their exact admin layout remains to be designed.

Only the title needs to be mandatory when saving a draft. Proposed publishing
requirements: a valid unique slug, summary, product type, and cover with appropriate
alt text. Revisit these requirements after selecting the fields.

## Proposed Rules to Review

- [x] Public endpoints return published projects only.
- [x] Archive instead of deleting by default; keep published slugs reserved.
- [x] Projects do not require a linked client; confidential projects can hide linked client identities and omit public links.
- [x] SEO fields fall back to visible project content.
- [x] Do not require ratings, testimonials, metrics, or delivery-time claims.
- [x] Editing a published project updates it immediately in the first version.

Saving unpublished revisions of live content would require a separate revision
workflow; it is not included in this proposal.

## Final Decisions

Fields to keep:

Requested additions: `built_with`, optional `client_id`, `clients`, reuse of the
existing `skills` catalog, and the `project_skills` relationship. Basic Markdown
support is requested for narrative fields.

Additional requested fields/relationships: `platforms`, `app_store_url`,
`play_store_url`, `timeline`, `contributors`, and `project_contributors`.
Recommended optional `services` array replaces `capabilities`. The screenshot's
`features` array is a separate undecided suggestion.

Timeline decision: publish a calculated duration summary, such as 8 weeks, while
keeping the source dates and full breakdown private. No independent duration column.

Fields to remove:

No general removal list has been provided. `client_display_name` is superseded
by the requested client relationship, and `capabilities` is superseded by the
recommended optional `services` array. `tech_stack` remains selected until its
overlap with the imported skills catalog is resolved.

Fields to defer:

Deferred: a managed service catalog and `project_services`. Undecided: `features`.
Client/review/contributor fields now follow the approved proposal in the
implementation guide. Public duration visibility is decided;
the full timeline breakdown stays internal.
Skills schema matches the supplied CSV; all 24 records have been imported and verified.

Other changes or questions:
