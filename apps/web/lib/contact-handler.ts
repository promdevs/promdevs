import {
  contactSchema,
  CONTACT_BODY_BYTES,
  type ContactInput,
} from "@promdevs/contracts";
import type { ContactReceipt } from "./contact-submission";

type SendContact = (
  payload: ContactInput,
  request: Request,
) => Promise<Response>;
const unavailable = "We couldn't send your message. Please try again shortly.";

// Both native forms and enhanced JSON submissions share validation and delivery.
export async function handleContact(request: Request, send: SendContact) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  const native = contentType === "application/x-www-form-urlencoded";
  const reply = (status: number, message: string, retryAfter?: string) => {
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    };
    if (retryAfter && /^\d+$/.test(retryAfter))
      headers["Retry-After"] = retryAfter;
    if (native) {
      const receipt: ContactReceipt =
        status < 300
          ? "sent"
          : status === 429
            ? "limited"
            : status < 500
              ? "invalid"
              : "unavailable";
      headers.Location = `/?view=html&contact=${receipt}#contact`;
      return new Response(null, { status: 303, headers });
    }
    return Response.json(status < 300 ? { message } : { error: message }, {
      status,
      headers,
    });
  };
  if (!native && contentType !== "application/json")
    return reply(415, "Send a form or application/json.");
  const reader = request.body?.getReader();
  if (!reader) return reply(400, "Invalid submission.");
  let payload: unknown;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > (native ? 64 * 1024 : CONTACT_BODY_BYTES)) {
        await reader.cancel();
        return reply(413, "Request is too large.");
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    payload = native
      ? Object.fromEntries(new URLSearchParams(text))
      : JSON.parse(text);
  } catch {
    return reply(400, "Invalid submission.");
  } finally {
    reader.releaseLock();
  }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success)
    return reply(400, parsed.error.issues[0]?.message || "Invalid input.");
  if (parsed.data.company.trim()) return reply(400, "Invalid submission.");
  try {
    const response = await send(parsed.data, request);
    const body = await response.json();
    if (response.ok) {
      if (!body || typeof body.message !== "string")
        return reply(503, unavailable);
      return reply(200, "Thanks, your message has been sent.");
    }
    const status =
      response.status >= 400 && response.status < 500 ? response.status : 503;
    const message =
      status === 503
        ? unavailable
        : typeof body?.error === "string"
          ? body.error
          : "We couldn't send your message. Please check your details and try again.";
    return reply(
      status,
      message,
      response.headers.get("retry-after") ?? undefined,
    );
  } catch {
    return reply(503, unavailable);
  }
}
