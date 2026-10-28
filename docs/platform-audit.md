# Platform Quality Pass

Date: 2026-10-28. Scope: public website, admin, API boundaries, production dependencies, and deployment configuration in this repository.

## Changes

- Projects: title, description, filters, then work. The description stays underneath the heading at every breakpoint. Existing project cards are unchanged. Search, counts, and reset controls remain removed; filters reuse the studio's shared action component.
- Planned pages: kept Client Stories marked Coming soon in the header. The homepage review section does not replace that future page. Other intentional placeholders are unchanged.
- Contact: added native POST submission for browsers without JavaScript. Both native and enhanced submissions use the same bounded request parsing, shared validation, honeypot, and API delivery path. Native receipts contain only an allowlisted status, not visitors' contact details or message text.
- Delivery: missing email configuration now returns a service failure instead of claiming success or printing visitors' private messages and attachment metadata to logs. Provider failures are not reported as successful deliveries.
- Admin: a successful HTTP response containing HTML, malformed JSON, a primitive, or an array is rejected instead of being accepted as a successful save. Authorization errors retain their status.
- Sitemap: an API outage returns a retryable 503 rather than a successful sitemap with all project URLs missing. Normal responses include the complete published catalog.
- Navigation: added ordinary header links for JavaScript-disabled browsing without changing the enhanced menus or planned-page labels.
- Mobile: contained the AI-tools strip's screen-reader label so it cannot expand the page's horizontal scroll area before JavaScript enhancement.
- Dependencies: Next.js and related Next packages updated to 16.4.1, Zod to 4.6.6, sharp to 0.35.5, and source-map-js to 1.2.2. Node 24 and pnpm 10.32.1 are retained.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass. The complete suite has 213 passing tests: 129 API, 17 admin, and 67 web.
- `pnpm audit --prod` reports zero advisories after the targeted updates. Before the update it reported two critical and four high advisories. This is a dependency-advisory result, not a claim that the platform is free of all security defects.
- Projects checked at 320, 390, 768, 1024, and 1440px in both themes: description below title and no horizontal overflow.
- Full homepage checked at those five widths with and without JavaScript: one H1, contact content available, and no horizontal overflow.
- Native contact success and failure checked end-to-end against a local, non-delivering API stub. Receipts correctly distinguish sent/unavailable; no contact data appears in redirect URLs. No real email was sent.
- Projects, Clients, Reviews, Skills, Contributors, Users, and Security admin screens checked at 390 and 1440px using mocked read-only responses. No real accounts or records were modified.
- Existing automated API tests cover permissions, draft/publication rules, identity visibility, invitations, session revocation, upload validation, and stale-write protection.
- Reviewed Docker health probes and the admin reverse proxy: health routes remain independent of database queries; upstream TLS verification stays enabled; admin proxy responses remain no-index.
- Limited tracked-file credential-pattern check found no matching private-key or live-key patterns. Only example environment files are tracked. This does not replace a full Git-history secret audit or credential rotation.

## Deployment And Boundaries

- Local development services were restarted on the patched dependencies. A browser tab holding old framework chunks may need a full reload after the upgrade.
- No commit, push, production deployment, migration, live record mutation, actual meeting booking, or live email delivery was performed.
- Rebuild and deploy the affected services before production receives these fixes. Because the contracts package changed, the existing Coolify watch-path setup correctly treats this as a shared-dependency change.
- Actual production delivery, DNS/TLS behavior, proxy/IP trust boundaries, database backups, and authenticated production workflows require separate operational verification. API authorization was tested using isolated fixtures, not by changing production data.

## Security References

- [Next.js image optimization advisory and patched versions](https://github.com/advisories/GHSA-2464-fhr4-w9xw).
- [Next.js cache-component advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr).
- [Zod validation resource-exhaustion advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
