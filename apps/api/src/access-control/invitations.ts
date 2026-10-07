import type { AdminInvite } from "@promdevs/contracts";
import { createSessionToken, tokenDigest, hashPassword } from "../auth.js";
import { HttpError } from "../errors.js";
import type { AuthIdentity } from "./auth-store.js";
import type {
  InvitationsStore,
  IssuedInvitation,
} from "./invitations-store.js";
import { userHasPermission } from "./roles.js";

export type InvitationEmail = {
  email: string;
  name: string;
  url: string;
  expiresAt: string;
};
export type InvitationMailer = {
  configured: () => boolean;
  send: (input: InvitationEmail) => Promise<void>;
};
export class Invitations {
  constructor(
    private readonly store: InvitationsStore,
    private readonly mailer: InvitationMailer,
    private readonly origin: string,
  ) {}
  private async available<T>(operation: () => Promise<T>) {
    try {
      return await operation();
    } catch {
      throw new HttpError(503, "Invitations are temporarily unavailable.");
    }
  }
  private authorize(actor: AuthIdentity) {
    if (!userHasPermission(actor, "users.invite"))
      throw new HttpError(403, "Only owners can invite administrators.");
    if (!this.mailer.configured())
      throw new HttpError(
        503,
        "Configure the API email provider before inviting administrators.",
      );
  }
  private async deliver(
    actor: AuthIdentity,
    result: IssuedInvitation,
    token: string,
  ) {
    if (result.outcome === "forbidden")
      throw new HttpError(
        403,
        "Only current owners can invite administrators.",
      );
    if (result.outcome === "missing")
      throw new HttpError(404, "Administrator not found.");
    if (result.outcome === "conflict")
      throw new HttpError(
        409,
        "This account already exists or is not awaiting an invitation. Use resend for an invited account.",
      );
    if (!result.user || !result.invitationId || !result.expiresAt)
      throw new HttpError(503, "Invitations are temporarily unavailable.");
    try {
      await this.mailer.send({
        email: result.user.email,
        name: result.user.name,
        url: `${this.origin}/#invite=${token}`,
        expiresAt: result.expiresAt,
      });
    } catch {
      await this.available(() =>
        this.store.cancelDelivery(actor.id, result.invitationId!),
      );
      throw new HttpError(
        503,
        "Invitation delivery could not be confirmed. Refresh Users; if the account is still awaiting activation, resend to issue a new link.",
      );
    }
    return result.user;
  }
  async create(actor: AuthIdentity, input: AdminInvite) {
    this.authorize(actor);
    const token = createSessionToken();
    return this.deliver(
      actor,
      await this.available(() =>
        this.store.create(actor, input, tokenDigest(token)!),
      ),
      token,
    );
  }
  async resend(actor: AuthIdentity, id: string) {
    this.authorize(actor);
    const token = createSessionToken();
    return this.deliver(
      actor,
      await this.available(() =>
        this.store.resend(actor, id, tokenDigest(token)!),
      ),
      token,
    );
  }
  async preview(token: string) {
    const digest = tokenDigest(token);
    const preview = digest
      ? await this.available(() => this.store.preview(digest))
      : null;
    if (!preview)
      throw new HttpError(
        400,
        "This invitation is invalid, expired, or no longer available.",
      );
    return preview;
  }
  async accept(token: string, password: string) {
    await this.preview(token);
    const hash = await hashPassword(password);
    if (
      !(await this.available(() =>
        this.store.accept(tokenDigest(token)!, hash),
      ))
    )
      throw new HttpError(
        400,
        "This invitation is invalid, expired, or no longer available.",
      );
  }
}
