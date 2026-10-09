# Public work and client stories

The homepage order is Hero, AI tools, What We Do, Selected Work, Client Stories,
About, FAQs, Contact. Empty or unavailable published collections hide their homepage
section; there is no fallback portfolio or fabricated testimonial.

## Content selection

- Work: all published, featured projects, in API sort order, retrieved through
  pagination. No featured projects means no homepage work section.
- Reviews: up to six published reviews, preferring featured entries in API order.
  A single review is static; multiple reviews transition automatically after at least
  12 seconds, allowing more time for longer quotes. Hover, keyboard focus, touch,
  text selection, offscreen placement, and background tabs pause progression.
  The fine progress line shares the actual remaining hold time and freezes while
  paused rather than restarting. Previous/next icon buttons allow manual navigation
  and reset the reading interval. Only manual changes announce the review position.
  Reduced motion keeps manual navigation with immediate changes and no autoplay;
  no JavaScript shows an ordinary readable list without inactive controls. Anonymous
  authors stay anonymous; optional ratings/titles stay optional.
- Listing and sitemap retrieve all public catalog pages. Project detail distinguishes
  missing/unpublished records (404) from service outages (error).
- Server reads are uncached. Publication changes appear on a fresh request; already
  open pages are not a live subscription. No API keys or DB connection go to the web.

Without JavaScript, a noscript refresh opens `/?view=html`, the same homepage with
both collections resolved before returning HTML. It retains the `/` canonical.
This avoids depending on React's streaming reveal scripts for visible content.

## Country globe

The globe never associates a country with a review, client, or project. Country
input is `WorkCountry[]` with `code`, `name`, `latitude`, `longitude`, and optional
`detail`; coordinates
represent a country, not a person or business address. Every environment currently
receives an empty array. The owner-provided summary above the globe reads
"100+ projects across 7 countries." It is independent of the marker input; no
coordinates, per-country counts, or review associations are inferred from it.

There are no sample countries or development labels. Replace the server-side
`apps/web/data/countries.ts` data source with a verified
country aggregate in a later API/database task; do not derive locations from reviews
or make geographic guesses about client names. Keep any future counts aggregate.

The scene imports Three.js only when visible, caps DPR at 1.5 and animation at 30fps,
and suspends offscreen and in background tabs. One revolution takes approximately
95 seconds. Hover, focus, and drag temporarily stop automatic rotation; leaving the
interaction resumes it. Pointer drag is bounded vertically. Touch gestures claim only
horizontal dragging, preserving vertical page scrolling. Arrow keys rotate the focused
globe. Reduced motion removes automatic rotation. Loading/WebGL failure/no-JavaScript
uses the local static poster. Blue marker buttons have 44px targets; their compact notes
track the projected surface point and fade before it rotates behind the globe.
There is no separate location panel, country list, or play/pause control.

See `apps/web/data/GLOBE-LICENSE.md` for geographic asset provenance and regeneration.

## FAQs and footer

The homepage has six native HTML disclosures before Contact. Questions and answers
are server-rendered and work without JavaScript. The repeated footer invitation has
been removed; its directory includes homepage links to Client Stories and FAQs.
Shared shell edges align the section introductions and About content.

## Checks

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Web tests use injected
fetch fixtures and never connect to the database, upload media, or send email. Browser
checks should use a separate fixture API and include zero/one/multiple records,
anonymous attribution, long quotes, both themes, no JS, unavailable WebGL, reduced
motion, and mobile scrolling. Deploy the web app only; no migration is required.
