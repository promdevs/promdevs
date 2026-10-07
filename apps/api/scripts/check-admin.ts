import "../src/config.js";
import { neon } from "@neondatabase/serverless";
import { ownerBootstrapSql } from "../src/access-control/owner-bootstrap.js";

async function checkAdmin() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Missing configuration");
  const query = neon(url);
  const [tables] = await query.query(ownerBootstrapSql.tables);
  if (!tables?.ready) {
    console.error(
      "Admin tables are missing. Apply the reviewed migration first.",
    );
    process.exitCode = 1;
    return;
  }
  const [state] = await query.query(`SELECT count(*)::int AS accounts,
    count(*) FILTER (WHERE role = 'owner' AND status = 'active'
      AND password_changed_at IS NOT NULL
      AND password_hash ~ '^scrypt[$][a-f0-9]{32}[$][a-f0-9]{128}$')::int AS owners
    FROM public.admin_users`);
  console.info(
    `Admin schema ready: ${state.accounts} account(s), ${state.owners} active owner(s) with credentials.`,
  );
  console.info(
    "Read-only verification; no credentials, accounts, sessions or audit records were changed.",
  );
  if (!state.owners) {
    console.error(
      "No active owner is ready. Bootstrap the first owner only if the account table has never been initialized.",
    );
    process.exitCode = 1;
  }
}

checkAdmin().catch(() => {
  console.error(
    "Admin readiness could not be checked. Verify DATABASE_URL and migration state; credentials were not printed.",
  );
  process.exitCode = 1;
});
