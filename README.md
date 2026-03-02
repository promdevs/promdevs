# PromDevs v1 (Coming Soon)

Single-page "Coming Soon" landing page built with Next.js App Router, TypeScript, and Tailwind CSS.

## Features

- Sticky header with brand lockup and anchor nav.
- Dark/light theme toggle (system default + localStorage persistence).
- Sections: Hero, Services, Work, About, Contact.
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

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Required for live email sending:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`

Optional:

- `CONTACT_FROM_EMAIL` (defaults to `onboarding@resend.dev`)

3. Start development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

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
# promdevs
# promdevs
