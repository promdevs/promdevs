import { randomUUID } from "node:crypto";
import type {
  AdminAccount,
  AdminAccountUpdate,
  AdminInvite,
} from "@promdevs/contracts";
import type {
  AccountsStore,
  AccountOutcome,
} from "../src/access-control/accounts-store.js";
import type { AuthIdentity } from "../src/access-control/auth-store.js";
import type {
  InvitationsStore,
  IssuedInvitation,
} from "../src/access-control/invitations-store.js";
import { MemoryAuth } from "./fixtures.js";

// Isolated test fixtures only. Never selected by the production server.
export class MemoryAccounts implements AccountsStore {
  names = new Map<string, string>();
  constructor(readonly auth: MemoryAuth) {}
  owner(actor: AuthIdentity) {
    const current = this.auth.users.get(actor.id);
    return (
      current?.status === "active" &&
      current.role === "owner" &&
      current.authVersion === actor.authVersion
    );
  }
  safe(id: string): AdminAccount {
    const user = this.auth.users.get(id)!;
    return {
      id,
      email: user.email,
      name: this.names.get(id) ?? "Test user",
      role: user.role,
      status: user.status,
      invitationRequired: !user.passwordHash,
      createdAt: new Date(this.auth.now).toISOString(),
      updatedAt: new Date(this.auth.now).toISOString(),
      lastLoginAt: null,
    };
  }
  async list(actor: AuthIdentity, limit: number, offset: number) {
    const allowed = this.owner(actor);
    const rows = allowed
      ? [...this.auth.users.keys()].map((id) => this.safe(id))
      : [];
    return {
      allowed,
      users: rows.slice(offset, offset + limit),
      total: rows.length,
    };
  }
  async update(actor: AuthIdentity, id: string, input: AdminAccountUpdate) {
    let outcome: AccountOutcome = "ok";
    const user = this.auth.users.get(id);
    if (!this.owner(actor)) outcome = "forbidden";
    else if (!user) outcome = "missing";
    else if (input.status === "active" && !user.passwordHash)
      outcome = "activation";
    else if (
      user.role === "owner" &&
      user.status === "active" &&
      ((input.role && input.role !== "owner") || input.status === "disabled") &&
      [...this.auth.users.values()].filter(
        (row) => row.role === "owner" && row.status === "active",
      ).length <= 1
    )
      outcome = "last_owner";
    if (outcome !== "ok" || !user) return { outcome, user: null };
    const accessChanged =
      (input.role !== undefined && input.role !== user.role) ||
      (input.status !== undefined && input.status !== user.status);
    this.auth.users.set(id, {
      ...user,
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
      authVersion: user.authVersion + (accessChanged ? 1 : 0),
    });
    if (input.name) this.names.set(id, input.name);
    if (accessChanged) this.revoke(id);
    this.auth.audits.push("user.updated");
    return { outcome, user: this.safe(id) };
  }
  revoke(id: string) {
    for (const session of this.auth.sessions.values())
      if (session.userId === id) session.revoked = true;
  }
  async revokeSessions(
    actor: AuthIdentity,
    id: string,
  ): Promise<AccountOutcome> {
    if (!this.owner(actor)) return "forbidden";
    const user = this.auth.users.get(id);
    if (!user) return "missing";
    this.auth.users.set(id, { ...user, authVersion: user.authVersion + 1 });
    this.revoke(id);
    this.auth.audits.push("user.sessions_revoked");
    return "ok";
  }
  async credentials(actor: AuthIdentity) {
    const user = this.auth.users.get(actor.id);
    return user?.status === "active" && user.authVersion === actor.authVersion
      ? { ...user }
      : null;
  }
  async changePassword(
    actor: AuthIdentity,
    expectedHash: string,
    newHash: string,
  ) {
    const user = await this.credentials(actor);
    if (!user || user.passwordHash !== expectedHash) return false;
    this.auth.users.set(user.id, {
      ...user,
      passwordHash: newHash,
      authVersion: user.authVersion + 1,
    });
    this.revoke(user.id);
    this.auth.audits.push("user.password_changed");
    return true;
  }
}
type Entry = {
  id: string;
  digest: string;
  userId: string;
  invitedBy: string;
  expiresAt: number;
  accepted: boolean;
  revoked: boolean;
};
export class MemoryInvitations implements InvitationsStore {
  entries = new Map<string, Entry>();
  constructor(readonly accounts: MemoryAccounts) {}
  private issue(
    actor: AuthIdentity,
    id: string,
    digest: string,
  ): IssuedInvitation {
    for (const entry of this.entries.values())
      if (entry.userId === id) entry.revoked = true;
    const entry = {
      id: randomUUID(),
      digest,
      userId: id,
      invitedBy: actor.id,
      expiresAt: this.accounts.auth.now + 72 * 60 * 60 * 1000,
      accepted: false,
      revoked: false,
    };
    this.entries.set(digest, entry);
    return {
      outcome: "ok",
      user: this.accounts.safe(id),
      invitationId: entry.id,
      expiresAt: new Date(entry.expiresAt).toISOString(),
    };
  }
  private denied(outcome: IssuedInvitation["outcome"]): IssuedInvitation {
    return { outcome, user: null, invitationId: null, expiresAt: null };
  }
  async create(actor: AuthIdentity, input: AdminInvite, digest: string) {
    if (!this.accounts.owner(actor)) return this.denied("forbidden");
    if (
      [...this.accounts.auth.users.values()].some(
        (user) => user.email === input.email,
      )
    )
      return this.denied("conflict");
    const id = randomUUID();
    this.accounts.auth.users.set(id, {
      id,
      email: input.email,
      passwordHash: null,
      status: "invited",
      role: input.role,
      authVersion: 1,
    });
    this.accounts.names.set(id, input.name);
    return this.issue(actor, id, digest);
  }
  async resend(actor: AuthIdentity, id: string, digest: string) {
    if (!this.accounts.owner(actor)) return this.denied("forbidden");
    const user = this.accounts.auth.users.get(id);
    if (!user) return this.denied("missing");
    if (user.passwordHash || !["invited", "disabled"].includes(user.status))
      return this.denied("conflict");
    this.accounts.auth.users.set(id, { ...user, status: "invited" });
    return this.issue(actor, id, digest);
  }
  async cancelDelivery(actorId: string, id: string) {
    for (const entry of this.entries.values())
      if (entry.id === id && entry.invitedBy === actorId) entry.revoked = true;
  }
  async preview(digest: string) {
    const entry = this.entries.get(digest);
    if (
      !entry ||
      entry.revoked ||
      entry.accepted ||
      entry.expiresAt <= this.accounts.auth.now
    )
      return null;
    const user = this.accounts.auth.users.get(entry.userId);
    const inviter = this.accounts.auth.users.get(entry.invitedBy);
    if (
      !user ||
      user.status !== "invited" ||
      inviter?.status !== "active" ||
      inviter.role !== "owner"
    )
      return null;
    return {
      name: this.accounts.names.get(user.id)!,
      email: user.email,
      role: user.role,
      expiresAt: new Date(entry.expiresAt).toISOString(),
    };
  }
  async accept(digest: string, passwordHash: string) {
    if (!(await this.preview(digest))) return false;
    const entry = this.entries.get(digest)!;
    if (entry.accepted) return false;
    entry.accepted = true;
    const user = this.accounts.auth.users.get(entry.userId)!;
    this.accounts.auth.users.set(user.id, {
      ...user,
      passwordHash,
      status: "active",
      authVersion: user.authVersion + 1,
    });
    return true;
  }
}
