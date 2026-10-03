import { desc, eq } from "drizzle-orm";
import type { Project, ProjectInput } from "@promdevs/contracts";
import { getDb } from "./db/client.js";
import { projects, type Project as ProjectRow } from "./db/schema.js";

export interface ProjectStore {
  list(): Promise<Project[]>;
  bySlug(slug: string): Promise<Project | null>;
  create(input: ProjectInput): Promise<Project>;
  update(id: number, input: ProjectInput): Promise<Project | null>;
  remove(id: number): Promise<boolean>;
}

const serialize = (row: ProjectRow): Project => ({
  ...row,
  tags: row.tags ?? [],
  createdAt: row.createdAt.toISOString(),
});

export const projectStore: ProjectStore = {
  async list() {
    return (
      await getDb()
        .select()
        .from(projects)
        .orderBy(
          desc(projects.featured),
          desc(projects.year),
          desc(projects.id),
        )
    ).map(serialize);
  },
  async bySlug(slug) {
    const [row] = await getDb()
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    return row ? serialize(row) : null;
  },
  async create(input) {
    const [row] = await getDb().insert(projects).values(input).returning();
    return serialize(row);
  },
  async update(id, input) {
    const [row] = await getDb()
      .update(projects)
      .set(input)
      .where(eq(projects.id, id))
      .returning();
    return row ? serialize(row) : null;
  },
  async remove(id) {
    const rows = await getDb()
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ id: projects.id });
    return rows.length > 0;
  },
};
