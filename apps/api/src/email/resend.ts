import { Resend } from "resend";

import type { ContactInput } from "@promdevs/contracts";
import { HttpError } from "../errors.js";

export type ContactEmailInput = Omit<ContactInput, "company">;

export async function sendContactEmail(payload: ContactEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const toName = process.env.CONTACT_TO_NAME ?? "PromDevs Team";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.CONTACT_FROM_NAME ?? "PromDevs Contact Form";

  const to = `${toName} <${toEmail}>`;
  const from = `${fromName} <${fromEmail}>`;

  if (!apiKey || !toEmail) {
    // Never acknowledge delivery or write a visitor's private message to logs.
    throw new HttpError(
      503,
      "We couldn't send your message. Please try again shortly.",
    );
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: from,
    to: to,
    replyTo: payload.email,
    attachments: payload.attachments?.map(
      ({ filename, content, contentType }) => ({
        filename,
        content,
        contentType,
      }),
    ),
    subject: `[PromDevs Contact] ${payload.subject}`,
    text: `Name: ${payload.name}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    ok: true,
    fallback: false,
  } as const;
}
