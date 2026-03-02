export function GET() {
  const content = `User-agent: *\nAllow: /\nSitemap: https://promdevs.com/sitemap.xml\n`;

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
