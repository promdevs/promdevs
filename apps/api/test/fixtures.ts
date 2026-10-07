import type { Project, ProjectInput } from "@promdevs/contracts";
import type {
  ProjectStore,
  ProjectReadScope,
  ProjectEditScope,
} from "../src/projects.js";
import type { PublicationStatus } from "../src/db/schema.js";
import type {
  AuthStore,
  AuthIdentity,
  LoginUser,
} from "../src/access-control/auth-store.js";
import { sessionMaxAge } from "../src/auth.js";
import { HttpError } from "../src/errors.js";

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
  async update(id: number, input: ProjectInput, scope: ProjectEditScope) {
    const row = this.rows.find((row) => row.id === id);
    if (!row) return null;
    if (scope.draftsOnly && this.publication.get(id) !== "draft")
      throw new HttpError(403, "Editors can only edit draft projects.");
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

// Shared by independent test server instances to model persistence, never used in production.
export class MemoryAuth implements AuthStore {
  users = new Map<string, LoginUser>();
  sessions = new Map<
    string,
    { userId: string; authVersion: number; expiresAt: number; revoked: boolean }
  >();
  audits: string[] = [];
  now = Date.now();
  beforeIssue?: () => void;
  async findUser(email: string) {
    const user = [...this.users.values()].find((user) => user.email === email);
    return user ? { ...user } : null;
  }
  async issue(
    expected: LoginUser,
    digest: string,
    previousDigest: string | null,
  ) {
    this.beforeIssue?.();
    const user = this.users.get(expected.id);
    if (
      !user ||
      user.status !== "active" ||
      user.authVersion !== expected.authVersion ||
      user.passwordHash !== expected.passwordHash
    )
      return null;
    this.sessions.set(digest, {
      userId: user.id,
      authVersion: user.authVersion,
      expiresAt: this.now + sessionMaxAge * 1000,
      revoked: false,
    });
    if (previousDigest) {
      const previous = this.sessions.get(previousDigest);
      if (previous) previous.revoked = true;
    }
    this.audits.push("auth.login");
    return this.identity(user);
  }
  async resolve(digest: string) {
    const session = this.sessions.get(digest);
    if (!session || session.revoked || session.expiresAt <= this.now)
      return null;
    const user = this.users.get(session.userId);
    if (
      !user ||
      user.status !== "active" ||
      user.authVersion !== session.authVersion
    )
      return null;
    return this.identity(user);
  }
  async revoke(digest: string) {
    const session = this.sessions.get(digest);
    if (session && !session.revoked) {
      session.revoked = true;
      this.audits.push("auth.logout");
    }
  }
  private identity(user: LoginUser): AuthIdentity {
    const { id, email, role, status, authVersion } = user;
    return { id, email, role, status, authVersion };
  }
}
