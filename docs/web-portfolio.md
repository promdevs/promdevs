# Public work and client stories

The homepage order is Hero, AI tools, What We Do, Selected Work, Client Stories,
FAQs, Contact. Empty or unavailable published collections hide their homepage
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

## Selected work presentation

Featured projects use compact, unboxed portfolio tiles: three columns on large
screens, two below 1100px, and one below 700px. A collection of two uses a narrower
two-column layout; a single tile is capped at 480px. Covers reserve a 16:10 area
with a quiet product-type label, then a two-line-maximum project name, small arrow,
and a one-line summary. There are no service chips, year rows, or per-card footers.
Each project is one keyboard-accessible link, with its complete title and summary
still rendered in HTML. Failed covers retain a quiet unavailable-preview message.
Entry reveals and subtle image/arrow hover effects respect reduced motion. A thin
SVG border runner appears on fine-pointer hover and keyboard focus, becoming a
static blue outline with reduced motion without changing the tile dimensions.
There is no pinned stage, horizontal progression, scroll controller, or carousel state;
every project is accessible through ordinary page scrolling, including without JS.
The project listing, reviews, and other homepage sections are unchanged.

## Country globe

Client Stories follows the page theme: solid white with graphite text in light
mode, and true black (`#000`) with ivory text in dark mode. The globe's opaque
surface uses the same true black, avoiding a blue/purple tint. This section has no
background grain, stippling, or dot pattern; only the globe itself is dotted. The
static CSS blue crescent remains behind the globe, softened in light mode. The
existing shell keeps content aligned. The globe follows the page theme without
recreating the scene or resetting rotation. The static poster, marker labels,
review controls, and globe surface use the same palette, including before JavaScript
and if WebGL fails. The halo does not intercept pointer events or add animation work.
Other sections retain their existing texture and themes.

The globe never associates a country with a review, client, or project. Country
input is `WorkCountry[]` with `code`, `name`, `latitude`, `longitude`, `markers`, and
optional `detail`. The owner supplied ten countries/territories with 71 illustrative
points: US 50, United Kingdom 10, Australia 3, India 2, and one each for Germany,
Puerto Rico, France, Slovenia, Nigeria, and United Arab Emirates. Points are spread within geographic
boundaries, not client addresses or a count of projects. The summary reads
"100+ projects across 10 countries & territories." The place total is derived from
the input; no review associations or per-country project counts are inferred.

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
uses the local static poster, including the same representative markers and initial
orientation. Canvas hit-testing lets any dot anchor a country note, with one 44px
keyboard-accessible country button per place rather than 71 overlapping controls.
Compact notes track the selected surface point and fade before it rotates behind the globe.
There is no separate location panel, country list, or play/pause control.

See `apps/web/data/GLOBE-LICENSE.md` for geographic asset provenance and regeneration.

## FAQs and footer

The homepage has six native HTML disclosures before Contact. Questions and answers
are server-rendered and work without JavaScript. The repeated footer invitation has
been removed; its directory includes homepage links to Client Stories and FAQs.
Shared shell edges align section introductions. The former About/Why PromDevs section is removed; About navigation is no longer linked to a missing section. Contact has a centered heading and description above a shared bordered workspace. Keyboard-accessible message/calendar tabs sit in a left sidebar on desktop and above the active interface on smaller screens. Drafts and opened calendars remain mounted across tab changes.

## Checks

Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Web tests use injected
fetch fixtures and never connect to the database, upload media, or send email. Browser
checks should use a separate fixture API and include zero/one/multiple records,
anonymous attribution, long quotes, both themes, no JS, unavailable WebGL, reduced
motion, and mobile scrolling. Contact attachments require deploying both the API and web app; no migration is required.
