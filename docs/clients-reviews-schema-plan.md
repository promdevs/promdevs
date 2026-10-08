# Clients and Reviews Schema Plan

Status: the approved proposal now has definitions in the canonical schema. No
client/review data imports, client/review APIs, or UI changes were made. The user
applied the migration separately; skills were imported as a separate step. See
[implementation details](database-schema.md). This original checklist remains
editable; its historical checkbox state is not the implementation inventory.

Related plan: [Projects](projects-schema-plan.md).

Check fields to keep, delete unwanted fields, or mark them Later. Unchecked fields
are undecided. Only relationships already requested are checked below.

## Model

Keep two main tables: `clients` and `reviews`.

- A client can be an individual or an organization.
- A client can have many projects and many reviews.
- A project can have no client, or one linked client in the first version.
- A review can concern the overall relationship or a particular project.
- Private client information and public review attribution are separate.

No separate testimonials table is needed. A testimonial is a published review
selected for display. A featured flag controls placement, not authenticity.

## Clients: Identity and Public Profile

- [ ] `id` (primary key): Stable identifier; finalize the type before creating related foreign keys.
- [ ] `name` (required text): Internal name of the client/person or organization.
- [ ] `client_type` (controlled value): Individual or organization.
- [ ] `public_name` (optional text): Approved public name; never fall back to a private name automatically.
- [x] `job_title` (optional text): Individual's role, or primary contact's role for an organization, such as Founder or Product Lead. Review attribution retains its separate `author_role`; do not expose the title for anonymous reviews.
- [ ] `industry` (optional text): Industry context.
- [ ] `website_url` (optional URL): Approved public website.
- [ ] `logo` (optional file reference): Approved client logo; not the binary image.

There is no global public-profile permission field or standalone client page.
Client details appear only through project details and published reviews, with
independent controls for each context. Internal contact information stays private.

Review notes:

## Clients: Private Contact and Administration

- [ ] `contact_name` (optional text): Primary contact person; useful for an organization.
- [ ] `contact_email` (optional text): Private contact email, not reviewer attribution.
- [ ] `contact_phone` (optional text): Private phone number, only if needed.
- [ ] `notes` (optional text): Internal relationship notes; exclude secrets/payment information.
- [ ] `status` (controlled value): Active or archived; archive instead of deleting history.
- [ ] `created_at` (timestamp): Creation time.
- [ ] `updated_at` (timestamp): Last edit.

Keep one primary contact initially. A separate `client_contacts` table can come
later if multiple people per organization actually need to be managed. Do not
require contact details just to record a client.

Review notes:

## Client Relationships

- [x] `projects.client_id` (nullable foreign key): Optional link to `clients.id`.
- [x] Reviews relate to clients; detailed review field selections remain proposed.
- [x] `projects.show_client` (boolean, default false): Client display on this project's detail page only; does not control any reviews.

Proposed public client display rule: the project is published, `show_client` is
true, and a linked client has suitable public display details. Otherwise
omit the client's identity. Return only allowlisted public fields, not the full
client object. A confidential project can retain its private client relationship.

Never fall back from a missing `public_name` to a private internal name. No
client-wide switch hides reviews; each review controls its own publication and
identity independently.

Archive clients by default. If deletion is ever supported, define explicit rules
for existing projects/reviews rather than silently cascading away history.

## Reviews: Content and Relationships

- [ ] `id` (primary key): Stable review identifier.
- [ ] `client_id` (foreign key): Link to `clients.id`; may be empty in a draft/import under review, but required before publication in this proposal.
- [ ] `project_id` (optional foreign key): Link to a specific project; blank for a general client relationship review.
- [ ] `title` (optional plain text): Short review heading.
- [ ] `body` (plain text): Review text; required before publication.
- [ ] `rating` (optional numeric value, 1-5): Actual rating on a five-point scale; a written testimonial need not include one.
- [ ] `reviewed_at` (optional date/timestamp): When the review was actually given; do not substitute the import date.

If a review links both a client and a project, their client relationships must
agree. Reassigning a project's client must not silently reattribute historical
reviews; flag existing links for review. Do not impose one review per client or
project: a client can legitimately provide multiple reviews over time.

Use plain text for attributed review content initially. Do not change quotations
or turn them into embellished marketing copy. A separate excerpt field is not
needed until an approved editing workflow is defined.

Review notes:

## Reviews: Approved Public Attribution

- [ ] `author_name` (optional text): Approved display name of the reviewer, not automatically copied from private contact data.
- [ ] `author_role` (optional text): Role/title at the time of the review.
- [ ] `author_company` (optional text): Approved company attribution at the time of the review.
- [ ] `author_avatar` (optional file reference): Approved portrait/avatar.
- [x] `show_identity` (boolean, default false): Show the stored reviewer attribution when true; otherwise show an anonymous label.

These are attribution snapshots: later changes to a client/contact record should
not rewrite who gave an old review. Named display requires a nonblank author name.
Never copy private contact data automatically to fill missing public details.
Anonymous publication keeps stored attribution private, suppresses name, role,
company, avatar, client identity, source URLs/external IDs, and identifying project
links from the public response. Use **Anonymous client**, not an internal client
ID. Check the title/body for identifying information before publishing anonymously.
The flag is not automatic anonymization of the original quotation.

Review notes:

## Reviews: Source, Visibility, and Placement

- [ ] `source` (controlled value): Where it originated, such as direct feedback, email, a review platform, or another documented source.
- [ ] `source_url` (optional URL): Public original review URL, where available; never expose private email or document links.
- [ ] `external_id` (optional text): Original platform's review ID for import deduplication.
- [x] `publication_status` (controlled value): Draft, published, or archived; defaults to draft. This is the show/hide control, so no duplicate `show_review` is needed.
- [ ] `featured` (boolean, default false): Include in selected homepage testimonials.
- [ ] `sort_order` (integer): Deliberate display order.
- [ ] `internal_notes` (optional private text): Import, moderation, or follow-up notes.
- [ ] `created_at` (timestamp): Record/import creation time.
- [ ] `updated_at` (timestamp): Last edit.
- [ ] `published_at` (optional timestamp): First publication time.

Public eligibility requires published status, valid content, and a resolved
client relationship. Publishing is your deliberate decision; there is no separate
permission enum. Merely checking featured must
never publish a draft. Do not add a generic verified badge without a defined,
evidence-backed verification process.

`show_client` does not affect review eligibility. `show_identity` does not hide
the review itself. No review means no testimonial to display, and unpublished
reviews do not contribute to public counts/averages.

When an external review ID exists, enforce uniqueness within its source. Detect
possible duplicates during manual imports too, but do not guess client matches
or silently merge similar-looking reviews. Hold unresolved imports as drafts.

Review notes:

## Ratings and Counts

- [ ] Derive public review/rating counts from eligible records; do not hand-edit totals.
- [ ] Calculate average rating from records that actually have valid ratings.
- [ ] Use all eligible rated records within the stated scope, not just featured testimonials.
- [ ] Keep written review count separate from rated review count.

Do not label a count of written testimonials as a count of ratings. An unrated
review is not zero stars. Round the displayed average consistently, but retain
the underlying numeric precision. The count and average must describe the same
stated dataset; a curated subset is not all customer feedback.

The first proposal uses a five-point rating scale. If imported sources use other
scales, review their original scale and mapping before accepting those ratings;
do not silently mix them. A platform-wide aggregate rating is not an individual
review and must not be imported as one. Independent aggregate source statistics
can be designed separately if they are needed.

This plan does not substantiate any existing homepage rating claim. Labels such
as 100+ ratings or 4.99 must be backed by actual data/source records before they
are presented as factual summaries.

## Proposed Admin Workflow

1. Create a client with only the necessary internal identity information.
2. Optionally link projects; set public client attribution independently.
3. Add/import a review and resolve its client and optional project relationship.
4. Review original text, rating, source, and attribution; choose named or anonymous display.
5. Publish deliberately; optionally feature the review and set its position.

Initially use admin-entered/imported reviews rather than a public review-submission
endpoint. A client submission/invitation workflow can be designed later.

## Public and Private Boundaries

The public API should explicitly select approved review text/attribution, rating,
public source links, and eligible project/client references only in named mode.
Anonymous mode must suppress identifying links and attribution, even if the
stored record contains them. Private contact details, internal notes, and unpublished reviews must not
appear in public JSON, rendered HTML, metadata, or frontend bundles.

An archived client should not automatically erase or rewrite historical reviews.
Keep review publication controls independent of project attribution. To withdraw
review identity, disable `show_identity` and inspect identifying text/links; to
remove the whole review, set its publication status to draft or archived.

## Final Decisions

Fields to keep:

Fields to remove:

`public_profile_permission`, `publication_permission`, and `permission_record`.
Do not replace them with a client-wide review switch or duplicate `show_review`.

Fields to defer:

Other changes or questions:
