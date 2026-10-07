import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Project, ProjectInput } from "@promdevs/contracts";
import { getDb } from "./db/client.js";
import {
  projects,
  workStatuses,
  type Project as ProjectRow,
  type WorkStatus,
} from "./db/schema.js";
import { HttpError } from "./errors.js";

export type ProjectReadScope = "public" | "admin";
export type ProjectEditScope = { draftsOnly: boolean };

export const projectEditCondition = (id: number, scope: ProjectEditScope) =>
  and(
    eq(projects.id, id),
    scope.draftsOnly ? eq(projects.publicationStatus, "draft") : undefined,
  );

export const projectDeletionSql = (
  id: number,
  actorId: string,
) => sql`WITH deleted AS (
  DELETE FROM ${projects} WHERE ${projects.id} = ${id} RETURNING id
), audited AS (
  INSERT INTO admin_audit_logs (actor_id, action, target_type, target_id)
  SELECT ${actorId}::uuid, 'project.deleted', 'project', id::text FROM deleted
) SELECT id FROM deleted`;

export interface ProjectStore {
  list(scope?: ProjectReadScope): Promise<Project[]>;
  bySlug(slug: string): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  update(
    id: number,
    input: ProjectInput,
    scope: ProjectEditScope,
  ): Promise<Project | null>;
  remove(id: number, actorId: string): Promise<boolean>;
}

// Preserve the current website/admin contract without selecting private columns.
export const legacyProjectFields = {
  id: projects.id,
  title: projects.title,
  slug: projects.slug,
  description: projects.description,
  category: projects.category,
  techStack: projects.techStack,
  coverImage: projects.coverImage,
  liveUrl: projects.liveUrl,
  githubUrl: projects.githubUrl,
  featured: projects.featured,
  status: projects.status,
  year: projects.year,
  problem: projects.problem,
  solution: projects.solution,
  results: projects.results,
  tags: projects.tags,
  createdAt: projects.createdAt,
};

type LegacyProjectRow = Pick<ProjectRow, keyof typeof legacyProjectFields>;

export const projectReadCondition = (scope: ProjectReadScope = "public") =>
  and(
    // The existing editor cannot display title-only drafts yet. Do not invent data.
    isNotNull(projects.slug),
    isNotNull(projects.year),
    sql`length(btrim(${projects.description})) > 0`,
    sql`length(btrim(${projects.category})) > 0`,
    sql`cardinality(${projects.techStack}) > 0`,
    scope === "public"
      ? eq(projects.publicationStatus, "published")
      : undefined,
  );

export const serializeProject = (row: LegacyProjectRow): Project => {
  if (row.slug === null || row.year === null)
    throw new HttpError(
      409,
      "This draft requires the expanded project editor.",
    );
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    category: row.category,
    techStack: row.techStack,
    coverImage: row.coverImage,
    liveUrl: row.liveUrl,
    githubUrl: row.githubUrl,
    featured: row.featured,
    status: row.status,
    year: row.year,
    problem: row.problem,
    solution: row.solution,
    results: row.results,
    tags: row.tags ?? [],
    createdAt: row.createdAt.toISOString(),
  };
};

function databaseInput(input: ProjectInput) {
  if (!workStatuses.includes(input.status as WorkStatus))
    throw new HttpError(
      400,
      "Choose in_progress, completed, or ongoing for status.",
    );
  for (const value of [input.liveUrl, input.githubUrl]) {
    if (value && (new URL(value).username || new URL(value).password))
      throw new HttpError(400, "Project URLs must not contain credentials.");
  }
  return { ...input, status: input.status as WorkStatus };
}

export const projectStore: ProjectStore = {
  async list(scope = "public") {
    return (
      await getDb()
        .select(legacyProjectFields)
        .from(projects)
        .where(projectReadCondition(scope))
        .orderBy(
          desc(projects.featured),
          desc(projects.year),
          desc(projects.id),
        )
    ).map(serializeProject);
  },
  async bySlug(slug) {
    const [row] = await getDb()
      .select(legacyProjectFields)
      .from(projects)
      .where(and(eq(projects.slug, slug), projectReadCondition()))
      .limit(1);
    return row ? serializeProject(row) : null;
  },
  async create(input) {
    const [row] = await getDb()
      .insert(projects)
      .values(databaseInput(input))
      .returning(legacyProjectFields);
    return serializeProject(row);
  },
  async update(id, input, scope) {
    const [row] = await getDb()
      .update(projects)
      .set(databaseInput(input))
      // Check the publication state in the UPDATE itself; a prior read would race publishing.
      .where(projectEditCondition(id, scope))
      .returning(legacyProjectFields);
    if (!row && scope.draftsOnly) {
      const [existing] = await getDb()
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      if (existing)
        throw new HttpError(403, "Editors can only edit draft projects.");
    }
    return row ? serializeProject(row) : null;
  },
  async remove(id, actorId) {
    // Deletion and its attribution must succeed or roll back together.
    const rows = await getDb().execute(projectDeletionSql(id, actorId));
    return rows.rows.length > 0;
  },
};
