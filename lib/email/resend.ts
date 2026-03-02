import { Resend } from "resend";

export type ContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export async function sendContactEmail(payload: ContactEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const toName = process.env.CONTACT_TO_NAME ?? "PromDevs Team";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.CONTACT_FROM_NAME ?? "PromDevs Contact Form";

  const to = `${toName} <${toEmail}>`;
  const from = `${fromName} <${fromEmail}>`;

  if (!apiKey || !toEmail) {
    console.info(
      "[TODO] Configure RESEND_API_KEY and CONTACT_TO_EMAIL. Contact payload:",
      payload
    );
    return {
      ok: true,
      fallback: true
    } as const;
  }

  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: from,
    to: to,
    replyTo: payload.email,
    subject: `[PromDevs Contact] ${payload.subject}`,
    text: `Name: ${payload.name}\nEmail: ${payload.email}\n\nMessage:\n${payload.message}`
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return {
    ok: true,
    fallback: false
  } as const;
}
