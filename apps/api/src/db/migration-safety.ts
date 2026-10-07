export type MigrationFile = {
  tag: string;
  when: number;
  hash: string;
  sql: string;
};
export type AppliedMigration = { hash: string; created_at: number | string };

// Mirrors Drizzle's timestamp-based pending check without executing any SQL.
export function assessMigrationState(
  files: MigrationFile[],
  applied: AppliedMigration[],
  existingTables: string[],
) {
  const issues: string[] = [];
  const latest = [...applied].sort(
    (a, b) => Number(b.created_at) - Number(a.created_at),
  )[0];
  if (
    latest &&
    !files.some(
      (file) =>
        file.when === Number(latest.created_at) && file.hash === latest.hash,
    )
  ) {
    issues.push(
      "The latest recorded migration does not match this checkout. Reconcile history before migrating.",
    );
  }
  const pending = files.filter(
    (file) => !latest || file.when > Number(latest.created_at),
  );
  const created = new Set(existingTables);
  for (const file of pending) {
    for (const match of file.sql.matchAll(/CREATE\s+TABLE\s+"([^"]+)"/gi)) {
      const name = match[1];
      if (created.has(name))
        issues.push(
          `${file.tag} would create ${name} again. Existing tables or duplicate history require reconciliation.`,
        );
      created.add(name);
    }
  }
  if (
    files.some(
      (file) =>
        file.tag === "0002_amused_beyonder" &&
        latest &&
        file.when <= Number(latest.created_at),
    ) &&
    !existingTables.includes("projects")
  ) {
    issues.push(
      "Migration history records the legacy projects table, but that table is missing.",
    );
  }
  return { pending, issues };
}
