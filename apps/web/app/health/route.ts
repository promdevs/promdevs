// Process liveness only: never render a page or check upstream services here.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "promdevs-web" },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
