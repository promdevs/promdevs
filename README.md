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

Use Node.js 24 LTS (see .nvmrc). Next.js 16.3.5, React 19.3.0, Tailwind CSS 4.3.3,
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

At the time of the refresh, npm audit --omit=dev reports zero vulnerabilities. Four moderate
advisories remain in the development-only drizzle-kit / esbuild dependency chain. npm's forced
fix proposes a breaking downgrade of drizzle-kit; that downgrade was deliberately not applied.

### Analytics

The existing GA4 measurement ID is retained. The old GoogleTagManager component was removed
because its supplied ID was a G- measurement ID, not a GTM- container ID.
