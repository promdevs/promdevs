// Drizzle 0.31 can add the FK before an existing table's new composite UNIQUE.
export function orderPortfolioConstraints(source: string): string {
  const separator = "--> statement-breakpoint";
  const statements = source.split(separator);
  const unique = statements.findIndex((statement) =>
    /ALTER TABLE "projects" ADD CONSTRAINT "projects_id_client_id_unique" UNIQUE\s*\(\s*"id"\s*,\s*"client_id"\s*\)/.test(
      statement,
    ),
  );
  const foreignKey = statements.findIndex((statement) =>
    /ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_client_fk"/.test(
      statement,
    ),
  );
  if (unique < 0 || foreignKey < 0 || unique < foreignKey) return source;
  const [constraint] = statements.splice(unique, 1);
  statements.splice(foreignKey, 0, constraint);
  return statements.join(separator);
}
