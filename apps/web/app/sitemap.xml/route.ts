import { getProjectCatalog } from "@/lib/api";
import { sitemapResponse } from "@/lib/sitemap-response";

export const dynamic = "force-dynamic";
export async function GET() {
  return sitemapResponse(getProjectCatalog);
}
