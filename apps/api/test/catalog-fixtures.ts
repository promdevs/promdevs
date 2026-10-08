import {
  catalogRecordSchemas,
  reviewPublicationIssues,
  type CatalogKind,
  type CatalogInput,
  type CatalogQuery,
  type CatalogRecord,
} from "@promdevs/contracts";
import type { CatalogStore } from "../src/catalog.js";
import type { AuthIdentity } from "../src/access-control/auth-store.js";
import { HttpError } from "../src/errors.js";
import type { MemoryAuth } from "./fixtures.js";
// Test/preview storage only; never selected by the production server.
export class MemoryCatalog implements CatalogStore {
  rows: Record<CatalogKind, Map<number, CatalogRecord>> = {
    clients: new Map(),
    reviews: new Map(),
    skills: new Map(),
    contributors: new Map(),
  };
  projects = new Map<
    number,
    { id: number; title: string; clientId: number | null }
  >();
  linkedSkills = new Set<number>();
  clock = Date.now();
  audits: string[] = [];
  constructor(private auth: MemoryAuth) {}
  private authorized(actor: AuthIdentity, manage = false) {
    const user = this.auth.users.get(actor.id);
    if (
      !user ||
      user.status !== "active" ||
      user.authVersion !== actor.authVersion ||
      (manage && user.role === "editor")
    )
      throw new HttpError(403, "Not allowed.");
  }
  async list(kind: CatalogKind, { q, state, limit, offset }: CatalogQuery) {
    const rows = [...this.rows[kind].values()]
      .filter((r) => {
        const review = "authorName" in r;
        const searchable = review
          ? `${r.authorName ?? "Unnamed author"} ${r.authorCompany ?? ""} ${r.title ?? ""} ${r.rating ?? ""} ${r.source}`
          : "name" in r
            ? `${r.name} ${"slug" in r ? r.slug + " " + r.category : "publicName" in r ? (r.publicName ?? r.industry ?? r.clientType) : (r.contactEmail ?? "")}`
            : "";
        const currentState =
          "publicationStatus" in r
            ? r.publicationStatus
            : "status" in r
              ? r.status
              : "active";
        return (
          (state === "all" || state === currentState) &&
          searchable.toLowerCase().includes(q.toLowerCase())
        );
      })
      .sort((a, b) => {
        if ("sortOrder" in a && "sortOrder" in b) {
          const placement =
            a.sortOrder - b.sortOrder ||
            Number(b.featured) - Number(a.featured);
          if (placement) return placement;
        }
        return b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;
      })
      .map((r) => {
        const name =
          "name" in r
            ? r.name
            : "title" in r
              ? r.authorName || "Unnamed author"
              : "Record";
        const detail =
          "category" in r
            ? r.category + " / " + r.slug
            : "source" in r
              ? (r.rating ? r.rating + " / 5 · " : "") + r.source
              : "contactEmail" in r
                ? r.contactEmail || ""
                : "";
        return {
          id: r.id,
          name,
          detail,
          state:
            "publicationStatus" in r
              ? r.publicationStatus
              : "status" in r
                ? r.status
                : "active",
          updatedAt: r.updatedAt,
          references: kind === "skills" && this.linkedSkills.has(r.id) ? 1 : 0,
          imageUrl: "logo" in r ? r.logo : "iconUrl" in r ? r.iconUrl : null,
          authorCompany: "authorCompany" in r ? r.authorCompany : null,
        };
      });
    return { records: rows.slice(offset, offset + limit), total: rows.length };
  }
  async get(kind: CatalogKind, id: number) {
    const record = this.rows[kind].get(id);
    return record ? structuredClone(record) : null;
  }
  async auditUpload(
    actor: AuthIdentity,
    kind: "clients" | "skills",
    key: string,
  ) {
    this.authorized(actor);
    this.audits.push(`${kind}.media_uploaded:${key}`);
  }
  async save(
    actor: AuthIdentity,
    kind: CatalogKind,
    input: CatalogInput,
    id?: number,
    expected?: string,
  ) {
    this.authorized(actor, !!id && kind !== "reviews");
    const previous = id ? this.rows[kind].get(id) : null;
    if (id && !previous) throw new HttpError(404, "Not found.");
    if (previous && previous.updatedAt !== expected)
      throw new HttpError(409, "Changed. Reload before saving.");
    if (
      previous &&
      "publicationStatus" in previous &&
      previous.publicationStatus !== "draft"
    )
      throw new HttpError(409, "Only drafts are editable.");
    if (kind === "skills" && "slug" in input) {
      if (
        previous &&
        "slug" in previous &&
        this.linkedSkills.has(previous.id) &&
        (previous.slug !== input.slug || previous.name !== input.name)
      )
        throw new HttpError(409, "Linked skill names are protected.");
      if (
        [...this.rows.skills.values()].some(
          (r) => "slug" in r && r.id !== id && r.slug === input.slug,
        )
      )
        throw new HttpError(409, "This skill slug is already in use.");
    }
    if (kind === "reviews" && "clientId" in input) {
      const client = input.clientId
        ? this.rows.clients.get(input.clientId)
        : null;
      const project = input.projectId
        ? this.projects.get(input.projectId)
        : null;
      if (
        (input.clientId &&
          (!client ||
            ("status" in client &&
              client.status === "archived" &&
              (!previous ||
                !("clientId" in previous) ||
                previous.clientId !== input.clientId)))) ||
        (input.projectId &&
          (!project || (input.clientId && project.clientId !== input.clientId)))
      )
        throw new HttpError(400, "Invalid client or project relationship.");
      if (
        input.externalId &&
        [...this.rows.reviews.values()].some(
          (r) =>
            "source" in r &&
            r.id !== id &&
            r.source === input.source &&
            r.externalId === input.externalId,
        )
      )
        throw new HttpError(409, "Duplicate external review.");
    }
    const now = new Date(++this.clock).toISOString();
    const row = catalogRecordSchemas[kind].parse({
      ...input,
      id: id ?? Math.max(0, ...this.rows[kind].keys()) + 1,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      ...(kind === "reviews"
        ? { publicationStatus: "draft", publishedAt: null }
        : kind === "skills"
          ? {}
          : {
              status:
                previous && "status" in previous ? previous.status : "active",
            }),
    });
    this.rows[kind].set(row.id, row);
    this.audits.push(kind + ".saved");
    return structuredClone(row);
  }
  async state(
    actor: AuthIdentity,
    kind: CatalogKind,
    id: number,
    state: string,
    expected: string,
  ) {
    this.authorized(actor, true);
    if (kind === "skills") throw new HttpError(400, "No skill state.");
    const previous = this.rows[kind].get(id);
    if (!previous) throw new HttpError(404, "Not found.");
    if (previous.updatedAt !== expected)
      throw new HttpError(409, "Record changed or read-only.");
    if ("publicationStatus" in previous) {
      if (
        state === previous.publicationStatus ||
        (state === "published" && previous.publicationStatus !== "draft") ||
        (state === "archived" && previous.publicationStatus !== "draft")
      )
        throw new HttpError(409, "Invalid publication transition.");
      const missing = reviewPublicationIssues(previous);
      if (state === "published" && missing.length)
        throw new HttpError(
          400,
          `Before publishing, complete: ${missing.join(", ")}.`,
        );
    }
    const now = new Date(++this.clock).toISOString();
    const row = catalogRecordSchemas[kind].parse({
      ...previous,
      [kind === "reviews" ? "publicationStatus" : "status"]: state,
      ...(kind === "reviews"
        ? { publishedAt: state === "published" ? now : null }
        : {}),
      updatedAt: now,
    });
    this.rows[kind].set(id, row);
    this.audits.push(
      kind === "reviews" &&
        (state === "published" ||
          ("publicationStatus" in previous &&
            previous.publicationStatus === "published"))
        ? `review.${state === "published" ? "published" : "unpublished"}`
        : kind + ".state_changed",
    );
    return structuredClone(row);
  }
  async options(q: string, clientId?: number, projectId?: number) {
    return {
      clients: [...this.rows.clients.values()]
        .filter(
          (r) =>
            "name" in r &&
            (r.id === clientId ||
              ("status" in r &&
                r.status === "active" &&
                r.name.toLowerCase().includes(q.toLowerCase()))),
        )
        .slice(0, 100)
        .map((r) => ({
          id: r.id,
          name: "name" in r ? r.name : "",
          status: "status" in r ? r.status : "active",
        })),
      projects: [...this.projects.values()]
        .filter(
          (p) =>
            p.id === projectId ||
            p.title.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 100),
    };
  }
}
