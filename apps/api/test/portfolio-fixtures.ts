import {
  adminProjectSchema,
  projectSummarySchema,
  type AdminProject,
  type DraftProjectInput,
  type PortfolioOptions,
} from "@promdevs/contracts";
import type { PortfolioStore, PortfolioQuery } from "../src/portfolio.js";
import type { AuthIdentity } from "../src/access-control/auth-store.js";
import { HttpError } from "../src/errors.js";
import type { MemoryAuth } from "./fixtures.js";
// Isolated fixtures only. Production always uses the database implementation.
export class MemoryPortfolio implements PortfolioStore {
  rows = new Map<number, AdminProject>();
  nextId = 1;
  clock = Date.now();
  audits: string[] = [];
  catalog: PortfolioOptions = {
    skills: [
      {
        id: 1,
        name: "TypeScript",
        slug: "typescript",
        category: "Frontend",
        iconUrl: null,
      },
    ],
    clients: [],
    contributors: [],
  };
  constructor(private auth: MemoryAuth) {}
  private authorized(actor: AuthIdentity, ownersOnly = false) {
    const user = this.auth.users.get(actor.id);
    if (
      !user ||
      user.status !== "active" ||
      user.authVersion !== actor.authVersion ||
      (ownersOnly && user.role === "editor")
    )
      throw new HttpError(403, "Not allowed.");
  }
  async list({ q, state, limit, offset }: PortfolioQuery) {
    const rows = [...this.rows.values()]
      .filter(
        (p) =>
          (state === "all" || p.publicationStatus === state) &&
          `${p.title} ${p.slug}`.toLowerCase().includes(q.toLowerCase()),
      )
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          Number(b.featured) - Number(a.featured) ||
          b.updatedAt.localeCompare(a.updatedAt) ||
          b.id - a.id,
      );
    return {
      projects: rows
        .slice(offset, offset + limit)
        .map((p) => projectSummarySchema.parse(p)),
      total: rows.length,
    };
  }
  async get(id: number) {
    const p = this.rows.get(id);
    return p ? structuredClone(p) : null;
  }
  async save(
    actor: AuthIdentity,
    input: DraftProjectInput,
    id?: number,
    expected?: string,
  ) {
    this.authorized(actor);
    const previous = id ? this.rows.get(id) : null;
    if (id && !previous) throw new HttpError(404, "Project not found.");
    if (previous?.publicationStatus !== "draft" && previous)
      throw new HttpError(409, "Only drafts can be edited.");
    if (previous && previous.updatedAt !== expected)
      throw new HttpError(409, "Project changed. Reload before saving.");
    if (
      [...this.rows.values()].some(
        (p) => p.id !== id && input.slug && p.slug === input.slug,
      )
    )
      throw Object.assign(new Error("Duplicate"), { code: "23505" });
    if (
      input.skillIds.some((id) => !this.catalog.skills.some((s) => s.id === id))
    )
      throw new HttpError(400, "Invalid skill.");
    if (
      input.clientId &&
      !this.catalog.clients.some((c) => c.id === input.clientId)
    )
      throw new HttpError(400, "Invalid client.");
    if (
      input.contributors.some(
        (c) => !this.catalog.contributors.some((p) => p.id === c.contributorId),
      )
    )
      throw new HttpError(400, "Invalid contributor.");
    const now = new Date(++this.clock).toISOString();
    const row = adminProjectSchema.parse({
      ...input,
      id: id ?? this.nextId++,
      publicationStatus: "draft",
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      publishedAt: null,
      techStack: input.skillIds.length
        ? input.skillIds.map(
            (id) => this.catalog.skills.find((s) => s.id === id)!.name,
          )
        : previous?.skillIds.length
          ? []
          : (previous?.techStack ?? []),
    });
    this.rows.set(row.id, row);
    this.audits.push(previous ? "project.updated" : "project.created");
    return structuredClone(row);
  }
  async state(
    actor: AuthIdentity,
    id: number,
    state: "draft" | "archived",
    expected: string,
  ) {
    this.authorized(actor, true);
    const row = this.rows.get(id);
    if (!row) throw new HttpError(404, "Not found.");
    if (row.publicationStatus === "published" || row.updatedAt !== expected)
      throw new HttpError(409, "State changed.");
    row.publicationStatus = state;
    row.updatedAt = new Date(++this.clock).toISOString();
    this.audits.push(`project.${state === "draft" ? "restored" : "archived"}`);
    return structuredClone(row);
  }
  async options() {
    return structuredClone(this.catalog);
  }
  async quickCreate(
    actor: AuthIdentity,
    kind: "clients" | "contributors",
    input: Record<string, unknown>,
  ) {
    this.authorized(actor);
    const id = this.catalog[kind].length + 1;
    if (kind === "clients")
      this.catalog.clients.push({
        id,
        name: String(input.name),
        clientType: input.clientType as "organization" | "individual",
        publicName: input.publicName as string | null,
        status: "active",
      });
    else
      this.catalog.contributors.push({
        id,
        name: String(input.name),
        status: "active",
      });
    this.audits.push(`${kind}.created`);
    return id;
  }
  async auditUpload(actor: AuthIdentity, id: number, key: string) {
    this.authorized(actor);
    if (this.rows.get(id)?.publicationStatus !== "draft")
      throw new HttpError(409, "Project changed.");
    this.audits.push(`media.uploaded:${key}`);
  }
}
