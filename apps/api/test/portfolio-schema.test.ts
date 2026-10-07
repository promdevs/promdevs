import assert from "node:assert/strict";
import { test } from "node:test";
import { getTableColumns, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pg-proxy";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import {
  clients,
  contributors,
  projectContributors,
  projectSkills,
  projects,
  reviews,
  skills,
} from "../src/db/schema.js";
import * as activeSchema from "../src/db/schema.js";
import {
  legacyProjectFields,
  projectReadCondition,
  serializeProject,
} from "../src/projects.js";
import { projectSchema } from "@promdevs/contracts";

const dialect = new PgDialect();
const models = [
  clients,
  contributors,
  projectContributors,
  projectSkills,
  projects,
  reviews,
  skills,
];

test("the canonical schema exports portfolio tables without the unused demo table", () => {
  assert.ok(!("demoUsers" in activeSchema));
  assert.equal(activeSchema.clients, clients);
  assert.equal(activeSchema.projects, projects);
  assert.equal(activeSchema.reviews, reviews);
  for (const table of models)
    assert.notEqual(getTableName(table), "demo_users");
});

test("portfolio CHECK definitions contain no unresolved SQL parameters", () => {
  for (const table of models) {
    for (const constraint of getTableConfig(table).checks) {
      const query = dialect.sqlToQuery(constraint.value);
      assert.deepEqual(
        query.params,
        [],
        `${constraint.name} has parameters in DDL`,
      );
      assert.doesNotMatch(query.sql, /\$\d+/);
    }
  }
});

test("the canonical schema retains legacy columns but responses use an explicit allowlist", () => {
  const columns = Object.values(legacyProjectFields).map(
    (column) => column.name,
  );
  assert.deepEqual(columns, [
    "id",
    "title",
    "slug",
    "description",
    "category",
    "tech_stack",
    "cover_image",
    "live_url",
    "github_url",
    "featured",
    "status",
    "year",
    "problem",
    "solution",
    "results",
    "tags",
    "created_at",
  ]);
  assert.equal(getTableName(projects), "projects");
  assert.ok("timeline" in getTableColumns(projects));
  assert.ok("clientId" in getTableColumns(projects));
  assert.ok(!("timeline" in legacyProjectFields));
  assert.ok(!("clientId" in legacyProjectFields));
});

test("new portfolio records are drafts and identity defaults are private", () => {
  assert.equal(projects.publicationStatus.default, "draft");
  assert.equal(reviews.publicationStatus.default, "draft");
  assert.equal(reviews.showIdentity.default, false);
  assert.equal(projects.showClient.default, false);
  assert.equal(projects.clientId.notNull, false);
  assert.equal(reviews.clientId.notNull, false);
  assert.equal(reviews.projectId.notNull, false);
});

test("project attribution and review visibility/identity have independent controls", () => {
  const clientColumns = Object.values(getTableColumns(clients)).map(
    (column) => column.name,
  );
  const reviewColumns = Object.values(getTableColumns(reviews)).map(
    (column) => column.name,
  );
  assert.ok(!clientColumns.includes("public_profile_permission"));
  for (const name of [
    "publication_permission",
    "permission_record",
    "show_review",
    "show_client",
  ]) {
    assert.ok(!reviewColumns.includes(name));
  }
  const config = getTableConfig(reviews);
  const publication = config.checks.find(
    (item) => item.name === "reviews_published_content_ready",
  );
  const identity = config.checks.find(
    (item) => item.name === "reviews_named_identity_ready",
  );
  assert.ok(publication);
  assert.ok(identity);
  const publicationSql = dialect.sqlToQuery(publication.value).sql;
  assert.doesNotMatch(
    publicationSql,
    /show_client|show_identity|permission|projects/,
  );
  assert.match(publicationSql, /client_id/);
  assert.match(publicationSql, /published_at/);
  const identitySql = dialect.sqlToQuery(identity.value).sql;
  assert.match(identitySql, /not .*show_identity/);
  assert.match(identitySql, /author_name.*is not null/);
});

test("a project draft requires a title, not a completed case study", () => {
  assert.equal(projects.title.notNull, true);
  assert.equal(projects.slug.notNull, false);
  assert.equal(projects.year.notNull, false);
  assert.equal(projects.description.hasDefault, true);
  assert.equal(projects.problem.notNull, false);
  assert.equal(projects.solution.notNull, false);
  assert.equal(projects.results.notNull, false);
  assert.ok(
    getTableConfig(projects).checks.some(
      (item) => item.name === "projects_published_content_ready",
    ),
  );
});

test("skills match supplied CSV headers and integer IDs", () => {
  assert.deepEqual(
    Object.values(getTableColumns(skills)).map((column) => column.name),
    ["id", "name", "slug", "icon_url", "category", "created_at", "updated_at"],
  );
  assert.equal(skills.id.getSQLType(), "serial");
  assert.equal(projectSkills.skillId.getSQLType(), "integer");
  assert.equal(skills.createdAt.getSQLType(), "timestamp");
  assert.equal(skills.updatedAt.getSQLType(), "timestamp");
});

test("many-to-many links prevent duplicates and index their reverse lookup", () => {
  for (const [table, names] of [
    [projectSkills, ["project_id", "skill_id"]],
    [projectContributors, ["project_id", "contributor_id"]],
  ] as const) {
    const config = getTableConfig(table);
    assert.deepEqual(
      config.primaryKeys[0].columns.map((column) => column.name),
      names,
    );
    assert.equal(config.foreignKeys.length, 2);
    assert.equal(config.indexes.length, 1);
    assert.ok(config.foreignKeys.every((key) => key.onDelete === "restrict"));
  }
});

test("review client/project attribution is enforced by a composite foreign key", () => {
  const key = getTableConfig(reviews).foreignKeys.find(
    (item) => item.getName() === "reviews_project_client_fk",
  );
  assert.ok(key);
  assert.deepEqual(
    key.reference().columns.map((column) => column.name),
    ["project_id", "client_id"],
  );
  assert.deepEqual(
    key.reference().foreignColumns.map((column) => column.name),
    ["id", "client_id"],
  );
  assert.equal(key.onDelete, "restrict");
  assert.equal(key.onUpdate, "restrict");
  assert.ok(
    getTableConfig(projects).uniqueConstraints.some(
      (item) => item.name === "projects_id_client_id_unique",
    ),
  );
});

test("review publication, five-point rating, and source deduplication are defined", () => {
  const config = getTableConfig(reviews);
  assert.ok(
    config.checks.some(
      (item) => item.name === "reviews_published_content_ready",
    ),
  );
  const rating = config.checks.find(
    (item) => item.name === "reviews_rating_valid",
  );
  assert.ok(rating);
  assert.match(dialect.sqlToQuery(rating.value).sql, /between 1 and 5/);
  assert.equal(reviews.rating.getSQLType(), "numeric(3, 2)");
  const dedup = config.indexes.find(
    (item) => item.config.name === "reviews_source_external_id_unique",
  );
  assert.ok(dedup);
  assert.equal(dedup.config.unique, true);
  assert.ok(dedup.config.where);
});

test("Markdown stays text, media/timeline stay structured, and duration is not duplicated", () => {
  for (const column of [
    projects.problem,
    projects.approach,
    projects.solution,
    projects.results,
  ]) {
    assert.equal(column.getSQLType(), "text");
  }
  assert.equal(projects.gallery.getSQLType(), "jsonb");
  assert.equal(projects.timeline.getSQLType(), "jsonb");
  const names = Object.values(getTableColumns(projects)).map(
    (column) => column.name,
  );
  assert.ok(!names.includes("duration_days"));
  assert.ok(!names.includes("builders"));
  assert.ok(!names.includes("features"));
  assert.ok(!names.includes("capabilities"));
});

test("public queries require publication and never select private project columns", () => {
  const db = drizzle(async () => ({ rows: [] }));
  const query = db
    .select(legacyProjectFields)
    .from(projects)
    .where(projectReadCondition())
    .toSQL();
  assert.match(query.sql, /"created_at"/);
  assert.doesNotMatch(
    query.sql.split(" from ")[0],
    /"timeline"|"client_id"|"services"|"built_with"/,
  );
  assert.match(query.sql, /publication_status/);
  assert.deepEqual(query.params, ["published"]);
  const adminQuery = db
    .select(legacyProjectFields)
    .from(projects)
    .where(projectReadCondition("admin"))
    .toSQL();
  assert.doesNotMatch(adminQuery.sql, /publication_status/);
});

test("serialization cannot leak additional fields or invent missing draft values", () => {
  const row = {
    id: 1,
    title: "Test",
    slug: "test",
    description: "Test-only summary",
    category: "Web",
    techStack: ["TypeScript"],
    coverImage: null,
    liveUrl: null,
    githubUrl: null,
    featured: false,
    status: "completed" as const,
    year: 2026,
    problem: null,
    solution: null,
    results: null,
    tags: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    clientId: 123,
    timeline: { start_date: "2026-01-01" },
    showClient: true,
    publicationStatus: "draft",
    internalNotes: "Must never leak",
  };
  const result = serializeProject(row);
  assert.deepEqual(projectSchema.parse(result), result);
  for (const key of [
    "clientId",
    "timeline",
    "showClient",
    "publicationStatus",
    "internalNotes",
  ]) {
    assert.ok(!(key in result));
  }
  assert.throws(
    () => serializeProject({ ...row, slug: null }),
    /expanded project editor/,
  );
  assert.throws(
    () => serializeProject({ ...row, year: null }),
    /expanded project editor/,
  );
});
