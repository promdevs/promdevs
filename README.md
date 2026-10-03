# PromDevs v2

Landing page built with Next.js App Router, TypeScript, and Tailwind CSS.

## Features

- Sticky header with brand lockup and anchor nav.
- Dark/light theme toggle (system default + localStorage persistence).
- Sections: Hero, Services, About, Contact; portfolio routes at `/projects`.
- Contact form with:
  - Client-side required validation.
  - Server-side validation (Zod).
  - Honeypot spam check (`company` must be empty).
  - In-memory IP rate limit (5 requests / 10 minutes).
  - Resend email sending, with a safe fallback to server logs if env vars are missing.
- SEO metadata + OpenGraph/Twitter.
- `robots.txt` and `sitemap.xml` route handlers.

## Tech

- Next.js App Router
- TypeScript
- Tailwind CSS
- Resend
- Zod

## Setup

1. Install dependencies:

```bash
npm install
```

1. Configure environment variables:

```bash
cp .env.example .env.local
```

Required for live email sending:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`

Optional:

- `CONTACT_FROM_EMAIL` (defaults to `onboarding@resend.dev`)
- `CONTACT_TO_NAME` and `CONTACT_FROM_NAME` for email display names.

Set `DATABASE_URL` in `.env` for the existing Neon/Drizzle project routes and
database CLI commands. Next.js also loads `.env.local`, but the Drizzle CLI's
`dotenv/config` reads `.env` by default. All of these values are server-only;
never prefix credentials with `NEXT_PUBLIC_`.

1. Start development server:

```bash
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000).

## Contact API

- Endpoint: `POST /api/contact`
- Payload:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Project inquiry",
  "message": "Let us discuss a build.",
  "company": ""
}
```

Responses:

- `200` success.
- `400` validation/honeypot failure.
- `429` rate limit exceeded.
- `500` provider or server error.

If Resend is not configured, submissions are accepted and logged server-side with a clear TODO log line.

## September 2026 design and dependency refresh

The homepage, project index, and project detail pages share a textured monochrome design.
Light mode uses neutral white and gray; dark mode uses near-black and charcoal. Theme follows
the system until manually selected, then persists in localStorage. The active stipple texture
lives at public/images/stipple.svg; palette and layout tokens live in app/globals.css.
DM Sans and Space Grotesk are self-hosted through Fontsource. Motion respects reduced-motion
preferences and page content remains visible without JavaScript.

### Runtime and versions

Use Node.js 24 LTS (see .nvmrc). Next.js 16.3.8, React 19.3.0, Tailwind CSS 4.3.3,
Lucide, Resend, Zod, and the other stable dependencies were updated against npm's stable tags.
TypeScript stays on the newest 6.x release because typescript-eslint does not yet support 7.0.
ESLint stays on the newest 9.x release because the plugins bundled with Next's config do not
support ESLint 10. The existing experimental Neon PostgREST package was not switched to beta.

Run npm run lint, npm run typecheck, and npm run build to verify changes.
Run npm run format to format application source.
Production hosting remains planned for Hetzner/Coolify; this change does not deploy anything.

### Existing project data

The project routes continue to read the existing Neon/Drizzle project table. DATABASE_URL
must be configured for those routes and for project prerendering during a production build.
The demo project catalog and seed command have been removed. Only real project records
should be added to this table. When it is empty, the portfolio shows a contact invitation
without sample cards or filter controls; unavailable project slugs return 404 and are omitted
from the sitemap. Local recovery exports are kept in `.local-backups/`, which is Git-ignored.
Future backend integration can replace this data source independently of the page layouts.

### Dependency audit

The October 2026 security check updated Next.js to 16.3.8, including the 16.3.6 security fix. The
production dependency audit reports zero vulnerabilities. The full audit still
reports 14 development-tooling advisories (8 high, 6 moderate), including
glob-matching dependencies, Drizzle/esbuild, and CLI utilities. Several suggested
fixes downgrade Next's ESLint config, shadcn, or drizzle-kit across major versions;
those breaking changes were deliberately not applied. Review these before using
development tools with untrusted input, and keep local development servers private.

### Analytics

The existing GA4 measurement ID is retained. The old GoogleTagManager component was removed
because its supplied ID was a G- measurement ID, not a GTM- container ID.

### Secret protection

Environment files and private-key formats are Git-ignored; `.env.example` contains
only empty credentials and safe defaults. Database and email modules use
`server-only` to prevent accidental imports into browser components.
The Google Analytics measurement ID is intentionally public, not an API secret.

The Secret scan GitHub workflow checks complete Git history on pushes and pull
requests. It uses a pinned, checksum-verified Gitleaks binary with default rules
plus a database-connection rule, and redacts detected values. No paid scanner
integration is needed. Check scans locally with Gitleaks 8.30.1:

```bash
gitleaks git --log-opts="--all" --redact=100 --no-banner .
```

If a real credential is ever committed, revoke or rotate it first. Deleting the
file or adding an ignore rule does not remove it from Git history, existing
clones, or forks. Coordinate any subsequent history rewrite rather than
force-pushing without agreement. Do not commit scan reports containing secrets.

### Social preview image

Open Graph and Twitter share the same 1200 x 630 PNG design, using the existing
PromDevs logo, local fonts, monochrome stipple, and homepage headline. Both images
have descriptive alt text and are discovered through Next.js file-based metadata.
No image-generation request or external font service runs in production.

To prepare the editable HTML composition:

```bash
node scripts/assets/prepare-social-card.mjs
```

Render the resulting `output/social/preview.html` in Chromium at 1200 x 630 and
device scale factor 1 after fonts load, then export the same PNG to
`app/opengraph-image.png` and `app/twitter-image.png`. The preview embeds local
assets and has no remote dependencies. Georgia is used for the italic serif on
the design machine, with Times New Roman as a fallback; the exported PNGs require
no fonts on the deployment server. Generated previews are Git-ignored.
