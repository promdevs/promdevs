import type { Project, ProjectInput } from "@promdevs/contracts";
import type { ProjectStore, ProjectReadScope } from "../src/projects.js";
import type { PublicationStatus } from "../src/db/schema.js";

// Test-only storage: never selected by the production API or connected to Neon.
export class MemoryProjects implements ProjectStore {
  private rows: Project[] = [];
  private publication = new Map<number, PublicationStatus>();
  private nextId = 1;
  async list(scope: ProjectReadScope = "public") {
    return this.rows.filter(
      (row) =>
        scope === "admin" || this.publication.get(row.id) === "published",
    );
  }
  async bySlug(slug: string) {
    return (
      this.rows.find(
        (row) =>
          row.slug === slug && this.publication.get(row.id) === "published",
      ) ?? null
    );
  }
  async create(input: ProjectInput) {
    if (this.rows.some((row) => row.slug === input.slug))
      throw Object.assign(new Error("Duplicate"), { code: "23505" });
    const row = {
      ...input,
      id: this.nextId++,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(row);
    this.publication.set(row.id, "draft");
    return row;
  }
  async update(id: number, input: ProjectInput) {
    const row = this.rows.find((row) => row.id === id);
    if (!row) return null;
    if (this.rows.some((row) => row.id !== id && row.slug === input.slug))
      throw Object.assign(new Error("Duplicate"), { code: "23505" });
    Object.assign(row, input);
    return row;
  }
  async remove(id: number) {
    const count = this.rows.length;
    this.rows = this.rows.filter((row) => row.id !== id);
    this.publication.delete(id);
    return this.rows.length < count;
  }
  setPublication(id: number, status: PublicationStatus) {
    this.publication.set(id, status);
  }
}
