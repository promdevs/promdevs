import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@promdevs/contracts";
import { apiUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader)
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  let payload: unknown;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 64 * 1024) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Request is too large." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 },
    );
  if (parsed.data.company.trim())
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  try {
    const response = await fetch(apiUrl("/api/contact"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For":
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json();
    return NextResponse.json(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        ...(response.headers.get("retry-after")
          ? { "Retry-After": response.headers.get("retry-after")! }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't send your message. Please try again shortly." },
      { status: 503 },
    );
  }
}
