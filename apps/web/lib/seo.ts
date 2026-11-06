import type { Metadata } from "next";
import { site } from "./site";

type SocialPage = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
};

// Nested metadata replaces, rather than merges, the parent's social fields.
export function socialMetadata({
  title,
  description,
  path,
  image,
  imageAlt = "PromDevs digital product studio: web, mobile and AI products.",
}: SocialPage): Pick<Metadata, "openGraph" | "twitter"> {
  const brandedTitle = /\|\s*PromDevs$/i.test(title)
    ? title
    : `${title} | ${site.name}`;
  return {
    openGraph: {
      title: brandedTitle,
      description,
      url: new URL(path, site.url).href,
      type: "website",
      siteName: site.name,
      locale: "en_US",
      images: [
        {
          url: image || `${site.url}/opengraph-image.png`,
          alt: imageAlt,
          ...(!image ? { width: 1200, height: 630 } : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description,
      images: [
        {
          url: image || `${site.url}/twitter-image.png`,
          alt: imageAlt,
        },
      ],
    },
  };
}
