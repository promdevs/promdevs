import { destinationKind, type PublicProject } from "@promdevs/contracts";

const labels: Record<string, string> = {
  website: "Website",
  web_app: "Web app",
  mobile_app: "Mobile app",
  ai_product: "AI product",
  web: "Web",
  ios: "iOS",
  android: "Android",
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  replit: "Replit",
  lovable: "Lovable",
  base44: "Base44",
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  bolt: "Bolt",
  v0: "v0",
};
export const projectLabel = (value: string) =>
  labels[value] ?? value.replaceAll("_", " ");
export const projectPageTitle = (
  project: Pick<PublicProject, "title" | "seoTitle">,
) => (project.seoTitle || project.title).replace(/\s*\|\s*PromDevs\s*$/i, "");
export function projectDestinations(
  project: Pick<
    PublicProject,
    "liveUrl" | "appStoreUrl" | "playStoreUrl" | "githubUrl"
  >,
) {
  const links: { href: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const value of [
    project.liveUrl,
    project.appStoreUrl,
    project.playStoreUrl,
    project.githubUrl,
  ]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        continue;
      const kind = destinationKind(value);
      const identity =
        kind === "app_store"
          ? `apple:${url.pathname.match(/id\d+/)?.[0]}`
          : kind === "play_store"
            ? `google:${url.searchParams.get("id")}`
            : value.replace(/\/$/, "");
      if (seen.has(identity)) continue;
      seen.add(identity);
      links.push({
        href: value,
        label:
          kind === "app_store"
            ? "App Store"
            : kind === "play_store"
              ? "Google Play"
              : value === project.githubUrl
                ? "View source"
                : "Visit website",
      });
    } catch {
      /* Ignore unusable legacy URLs rather than rendering unsafe links. */
    }
  }
  return links;
}

export function breadcrumbData(
  origin: string,
  items: { name: string; path: string }[],
) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, origin).href,
    })),
  }).replaceAll("<", "\\u003c");
}
