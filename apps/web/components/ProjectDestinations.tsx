import Image from "next/image";
import { destinationKind } from "@promdevs/contracts";
import { ActionLink } from "./Action";
import type { projectDestinations } from "../lib/project-catalog";

export function ProjectDestinations({
  links,
}: {
  links: ReturnType<typeof projectDestinations>;
}) {
  if (!links.length) return null;
  const rank = { web: 0, app_store: 1, play_store: 2 };
  const ordered = links.toSorted(
    (a, b) => rank[destinationKind(a.href)] - rank[destinationKind(b.href)],
  );
  const firstWeb = ordered.find((link) => destinationKind(link.href) === "web");
  return (
    <div
      className="case-destinations"
      data-store-links={
        ordered.some((link) => destinationKind(link.href) !== "web") ||
        undefined
      }
    >
      {ordered.map((link) => {
        const kind = destinationKind(link.href);
        if (kind === "web")
          return (
            <ActionLink
              key={link.href}
              href={link.href}
              label={link.label}
              variant={link === firstWeb ? "primary" : "secondary"}
              newTab
            />
          );
        return (
          <a
            key={link.href}
            className="case-store-link"
            data-store={kind}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (opens in a new tab)`}
          >
            <Image
              src={`/assets/stores/${kind === "app_store" ? "app-store" : "google-play"}.svg`}
              alt={
                kind === "app_store"
                  ? "Download on the App Store"
                  : "Get it on Google Play"
              }
              width={kind === "app_store" ? 120 : 135}
              height={40}
              unoptimized
            />
          </a>
        );
      })}
    </div>
  );
}
