import { apiUrl } from "@/lib/api";
import { handleContact } from "@/lib/contact-handler";

export async function POST(request: Request) {
  return handleContact(request, (payload, submission) =>
    fetch(apiUrl("/api/contact"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For":
          submission.headers.get("x-forwarded-for") ||
          submission.headers.get("x-real-ip") ||
          "unknown",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    }),
  );
}
