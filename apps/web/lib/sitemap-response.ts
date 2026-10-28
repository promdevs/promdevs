import { site } from "./site";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character]!,
  );

export async function sitemapResponse(read: () => Promise<{ slug: string }[]>) {
  try {
    const projects = await read();
    const paths = [
      "/",
      "/projects",
      ...projects.map(({ slug }) => `/projects/${encodeURIComponent(slug)}`),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((path) => `  <url><loc>${escapeXml(site.url + path)}</loc></url>`).join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Ask crawlers to retry instead of claiming published project URLs disappeared.
    return new Response(
      "Sitemap temporarily unavailable. Please try again shortly.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "Retry-After": "60",
        },
      },
    );
  }
}
