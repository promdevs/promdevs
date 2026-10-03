export const dynamic = "force-dynamic";
import { getProjects } from "@/lib/api";
import { site } from "@/lib/site";

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

export async function GET() {
  let slugs: string[] = [];
  try {
    const rows = await getProjects();
    slugs = rows.map(({ slug }) => slug);
  } catch {
    // Keep the core pages discoverable if the project data source is unavailable.
  }
  const urls = [
    "/",
    "/projects",
    ...slugs.map((slug) => `/projects/${encodeURIComponent(slug)}`),
  ];
  const content = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${escapeXml(site.url + path)}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(content, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
