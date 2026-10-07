import assert from "node:assert/strict";
import { test } from "node:test";
import { orderPortfolioConstraints } from "../src/db/migration-order.js";

const unique =
  'ALTER TABLE "projects" ADD CONSTRAINT "projects_id_client_id_unique" UNIQUE("id","client_id");';
const foreignKey =
  'ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_client_fk" FOREIGN KEY ("project_id","client_id") REFERENCES "projects"("id","client_id");';
const column = 'ALTER TABLE "projects" ADD COLUMN "client_id" integer;';
const separator = "--> statement-breakpoint\n";

test("incremental migration creates the composite UNIQUE before the review FK", () => {
  const source = [column, foreignKey, unique].join(separator);
  const ordered = orderPortfolioConstraints(source);
  assert.ok(ordered.indexOf(column) < ordered.indexOf(unique));
  assert.ok(ordered.indexOf(unique) < ordered.indexOf(foreignKey));
  assert.equal(ordered.split("ADD CONSTRAINT").length, 3);
});
test("already-correct and later migrations are unchanged", () => {
  const source = [column, unique, foreignKey].join(separator);
  assert.equal(orderPortfolioConstraints(source), source);
  assert.equal(orderPortfolioConstraints(foreignKey), foreignKey);
  assert.equal(orderPortfolioConstraints(column), column);
});
