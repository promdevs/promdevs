import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectImage } from "../components/ProjectImage";
import { SelectedWorkCover } from "../components/SelectedWorkCover";
import { socialMetadata } from "../lib/seo";
import { canOptimizeImage, portfolioImagePattern } from "../lib/image-delivery";
import { site } from "../lib/site";

test("social metadata explicitly provides large previews and complete Open Graph defaults", () => {
  const metadata = socialMetadata({
    title: "About the studio",
    description: "Meet the studio.",
    path: "/about",
  });
  assert.deepEqual(metadata.openGraph, {
    title: "About the studio | PromDevs",
    description: "Meet the studio.",
    url: `${site.url}/about`,
    type: "website",
    siteName: "PromDevs",
    locale: "en_US",
    images: [
      {
        url: `${site.url}/opengraph-image.png`,
        alt: "PromDevs digital product studio: web, mobile and AI products.",
        width: 1200,
        height: 630,
      },
    ],
  });
  assert.deepEqual(metadata.twitter, {
    card: "summary_large_image",
    title: "About the studio | PromDevs",
    description: "Meet the studio.",
    images: [
      {
        url: `${site.url}/twitter-image.png`,
        alt: "PromDevs digital product studio: web, mobile and AI products.",
      },
    ],
  });
});

test("project-specific previews preserve uploaded URLs and alt text without guessing dimensions", () => {
  const image = "https://media.promdevs.com/images/projects/cover.webp";
  const metadata = socialMetadata({
    title: "A product | PromDevs",
    description: "The actual project description.",
    path: "/projects/a-product",
    image,
    imageAlt: "The actual project cover.",
  });
  assert.equal(metadata.openGraph?.title, "A product | PromDevs");
  assert.deepEqual(metadata.openGraph?.images, [
    { url: image, alt: "The actual project cover." },
  ]);
  assert.deepEqual(metadata.twitter?.images, [
    { url: image, alt: "The actual project cover." },
  ]);
  const fallback = socialMetadata({
    title: "Product",
    description: "Description",
    path: "/projects/product",
    image: "",
  });
  assert.ok(JSON.stringify(fallback).includes("/opengraph-image.png"));
});

test("every public metadata override includes the shared social defaults", async () => {
  for (const path of [
    "app/layout.tsx",
    "app/about/page.tsx",
    "app/services/page.tsx",
    "app/client-stories/page.tsx",
    "app/projects/page.tsx",
    "app/projects/[slug]/page.tsx",
    "app/expertise/[platform]/page.tsx",
    "app/(legal)/privacy-policy/page.tsx",
    "app/(legal)/terms-of-service/page.tsx",
  ]) {
    const source = await readFile(
      new URL(`../${path}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /\.\.\.socialMetadata\(/, path);
  }
});

test("only local static rasters and the exact public media origin use the image optimizer", async () => {
  for (const src of [
    "/images/founder/moses-adebayo-bw.webp",
    "/assets/example.png",
    "https://media.promdevs.com/images/projects/cover.png",
    "https://media.promdevs.com/images/clients/avatar.jpg",
  ])
    assert.equal(canOptimizeImage(src), true, src);
  for (const src of [
    "",
    "not a url",
    "//media.promdevs.com/images/project.png",
    "http://media.promdevs.com/images/project.png",
    "https://media.promdevs.com.evil.test/images/project.png",
    "https://user:password@media.promdevs.com/images/project.png",
    "https://media.promdevs.com:444/images/project.png",
    "https://media.promdevs.com/private/project.png",
    "https://media.promdevs.com/images/project.png?token=private",
    "https://media.promdevs.com/images/logo.svg",
    "https://media.promdevs.com/images/animation.gif",
    "https://other.example/image.png",
    "/api/contact",
    "/assets/logo.svg",
  ])
    assert.equal(canOptimizeImage(src), false, src);
  assert.equal(portfolioImagePattern.hostname, "media.promdevs.com");
  assert.equal(portfolioImagePattern.pathname, "/images/**");
  assert.equal(portfolioImagePattern.search, "");
  const config = await readFile(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );
  assert.match(config, /remotePatterns: \[portfolioImagePattern\]/);
  assert.match(config, /maximumRedirects: 0/);
});

test("project images emit responsive sources and retain original URLs for unsupported hosts", () => {
  for (const Component of [ProjectImage, SelectedWorkCover]) {
    const html = renderToStaticMarkup(
      createElement(Component, {
        src: "/images/founder/moses-adebayo-bw.webp",
        alt: "Actual uploaded image",
        sizes: "92vw",
      }),
    );
    assert.match(html, /srcSet=/);
    assert.match(html, /\/_next\/image\?/);
    assert.match(html, /loading="lazy"/);
    const legacy = renderToStaticMarkup(
      createElement(Component, {
        src: "https://legacy.example/image.png",
        alt: "Original image",
        sizes: "92vw",
      }),
    );
    assert.match(legacy, /src="https:\/\/legacy.example\/image.png"/);
    assert.doesNotMatch(legacy, /srcSet=/);
  }
});
