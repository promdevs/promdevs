# Platform expertise pages

Routes: `/expertise/replit`, `/expertise/lovable`, `/expertise/base44`.

These are public, server-rendered service pages. Platform content lives in
`apps/web/data/expertise.ts`; shared composition and scoped styles live in
`ExpertisePage.tsx` and `app/expertise/expertise.css`. The lightweight navigation
config is separate so the full copy does not enter the header's client bundle.

## Direction

Original PromDevs copy and composition, informed by:

- https://www.mathiasmedia.com/lovable — clear platform positioning and proof.
- https://hiaydin.dev/en/services/replit — building, improving, and launching.
- https://www.designme.agency/services/framer-agency — platform-fit guidance and process.

No borrowed client claims, certification tiers, metrics, pricing, or timelines.
Certification is shown only for Replit and Lovable, as confirmed by the owner.
Base44 is described as expertise, not an official partnership or certification.

## Published evidence

The existing paginated public API is read uncached. Summaries do not expose
`builtWith`, so detail reads are batched at a maximum concurrency of four.
Only exact, case-insensitive `builtWith` matches are eligible. Page content does
not infer platform use from project names, descriptions, tags, or skills.

Up to three matching published projects are shown in API order. Feedback is
limited to one public review explicitly linked to a matching project's slug.
Existing public identity rules apply. Unlinked reviews are never attributed
to the platform. Failed detail reads are logged and omitted; catalog failures
hide evidence, not the service content. Empty evidence sections do not render.

No records, API interfaces, admin pages, homepage content, or schema changed.
Native anchors and FAQ details remain usable without JavaScript; shared
MotionReveal and ActionLink supply existing motion/reduced-motion behavior.

## Technical claims

Platform details were checked against primary documentation:

- https://docs.replit.com/learn/projects-and-artifacts/replit-deployments
- https://docs.lovable.dev/integrations/github
- https://docs.base44.com/
- https://base44.com/developers

Lovable source-code export is not presented as a complete backend/data migration.
Base44's managed backend and migration constraints require project-specific
assessment; no guarantee of standalone application export is made.
All scope, publishing options, and plan limitations must be assessed at enquiry.
