# PromDevs workspace

- Use pnpm 10.32.1 and Node.js 24. Do not add npm or Yarn lockfiles.
- Public website: `apps/web`; admin: `apps/admin`; API: `apps/api`.
- Shared contracts live in `packages/contracts`; browser-safe UI in `packages/ui`.
- Database access, credentials, and email sending belong exclusively in the API.
- Do not run migrations or mutate live data without explicit authorization.
- Read `apps/web/AGENTS.md` and the installed Next.js guides before editing Next.js code.
- Validate with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
