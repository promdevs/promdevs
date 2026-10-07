import type {
  AdminAccountUpdate,
  AdminPasswordChange,
} from "@promdevs/contracts";
import { hashPassword, verifyPassword } from "../auth.js";
import { HttpError } from "../errors.js";
import type { AuthIdentity } from "./auth-store.js";
import type { AccountsStore, AccountOutcome } from "./accounts-store.js";
import { userHasPermission } from "./roles.js";

function requireOwner(actor: AuthIdentity) {
  if (!userHasPermission(actor, "users.edit"))
    throw new HttpError(403, "Only owners can manage administrators.");
}
function requireOutcome(outcome: AccountOutcome) {
  if (outcome === "forbidden")
    throw new HttpError(403, "Only current owners can manage administrators.");
  if (outcome === "missing")
    throw new HttpError(404, "Administrator not found.");
  if (outcome === "last_owner")
    throw new HttpError(
      409,
      "You cannot disable or demote the last active owner.",
    );
  if (outcome === "activation")
    throw new HttpError(
      409,
      "An account must complete its invitation before activation.",
    );
  if (outcome !== "ok")
    throw new HttpError(503, "Account management is temporarily unavailable.");
}

export class Accounts {
  constructor(private readonly store: AccountsStore) {}
  private async available<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch {
      throw new HttpError(
        503,
        "Account management is temporarily unavailable.",
      );
    }
  }
  async list(actor: AuthIdentity, limit: number, offset: number) {
    requireOwner(actor);
    const result = await this.available(() =>
      this.store.list(actor, limit, offset),
    );
    if (!result.allowed) requireOutcome("forbidden");
    return { users: result.users, total: result.total, limit, offset };
  }
  async update(actor: AuthIdentity, id: string, input: AdminAccountUpdate) {
    requireOwner(actor);
    const result = await this.available(() =>
      this.store.update(actor, id, input),
    );
    requireOutcome(result.outcome);
    if (!result.user)
      throw new HttpError(
        503,
        "Account management is temporarily unavailable.",
      );
    return result.user;
  }
  async revokeSessions(actor: AuthIdentity, id: string) {
    requireOwner(actor);
    requireOutcome(
      await this.available(() => this.store.revokeSessions(actor, id)),
    );
  }
  async changePassword(actor: AuthIdentity, input: AdminPasswordChange) {
    const user = await this.available(() => this.store.credentials(actor));
    if (
      !user?.passwordHash ||
      !(await verifyPassword(input.currentPassword, user.passwordHash))
    )
      throw new HttpError(
        400,
        "Current password is incorrect or the session has changed.",
      );
    const newHash = await hashPassword(input.newPassword);
    if (
      !(await this.available(() =>
        this.store.changePassword(actor, user.passwordHash!, newHash),
      ))
    )
      throw new HttpError(
        409,
        "Your account changed. Sign in again before changing your password.",
      );
  }
}
