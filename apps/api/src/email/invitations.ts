import { Resend } from "resend";
import type { InvitationMailer } from "../access-control/invitations.js";

export const invitationMailer: InvitationMailer = {
  configured: () =>
    !!process.env.RESEND_API_KEY &&
    !!(process.env.ADMIN_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL),
  async send(input) {
    const sender =
      process.env.ADMIN_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL;
    if (!process.env.RESEND_API_KEY || !sender || /[\r\n]/.test(sender))
      throw new Error("Invitation email is not configured");
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: `PromDevs Studio <${sender}>`,
      to: input.email,
      subject: "Your invitation to the PromDevs studio",
      text: `Hi ${input.name},\n\nYou have been invited to the PromDevs admin workspace. Set your own password using this private link:\n\n${input.url}\n\nThis single-use link expires in 72 hours. If you weren't expecting this invitation, ignore it.\n\nPromDevs`,
    });
    if (result.error || !result.data?.id)
      throw new Error("Invitation delivery could not be confirmed");
  },
};
