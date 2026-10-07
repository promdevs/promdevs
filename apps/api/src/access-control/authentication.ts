import {
  createSessionToken,
  isPasswordHash,
  tokenDigest,
  verifyPassword,
} from "../auth.js";
import { HttpError } from "../errors.js";
import { isAdminRole } from "./roles.js";
import type { AuthStore } from "./auth-store.js";

// Only a timing-work substitute for unknown/inactive users; never accepted as credentials.
const dummyHash = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

export class Authentication {
  constructor(private readonly store: AuthStore) {}

  private async available<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      // Driver errors may include credentials or SQL parameters. Fail closed without exposing them.
      throw new HttpError(
        503,
        "Admin authentication is temporarily unavailable.",
      );
    }
  }

  async login(email: string, password: string, previousToken = "") {
    const user = await this.available(() =>
      this.store.findUser(email.trim().toLowerCase()),
    );
    const eligible =
      user?.status === "active" &&
      isAdminRole(user.role) &&
      !!user.passwordHash &&
      isPasswordHash(user.passwordHash);
    const valid = await verifyPassword(
      password,
      eligible ? user.passwordHash! : dummyHash,
    );
    if (!eligible || !valid)
      throw new HttpError(401, "Invalid email or password.");
    const token = createSessionToken();
    const identity = await this.available(() =>
      this.store.issue(user, tokenDigest(token)!, tokenDigest(previousToken)),
    );
    // A concurrent credential/status change invalidates the login before session issuance.
    if (!identity) throw new HttpError(401, "Invalid email or password.");
    return { identity, token };
  }

  async session(token: string) {
    const digest = tokenDigest(token);
    if (!digest) return null;
    return this.available(() => this.store.resolve(digest));
  }

  async logout(token: string) {
    const digest = tokenDigest(token);
    if (digest) await this.available(() => this.store.revoke(digest));
  }
}
