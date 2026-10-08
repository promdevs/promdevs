import type { DraftProjectInput } from "./portfolio.js";
import type { catalogInputs } from "./catalog.js";
import type { z } from "zod";

export function projectPublicationIssues(project: DraftProjectInput): string[] {
  const missing: string[] = [];
  if (!project.slug?.trim()) missing.push("URL slug");
  if (!project.description.trim()) missing.push("Description");
  if (!project.productTypes.length) missing.push("Product type");
  if (!project.coverImage?.trim()) missing.push("Cover image");
  if (!project.coverAlt?.trim()) missing.push("Cover image alt text");
  return missing;
}

export function reviewPublicationIssues(
  review: Pick<
    z.output<typeof catalogInputs.reviews>,
    "clientId" | "body" | "showIdentity" | "authorName"
  >,
): string[] {
  const missing: string[] = [];
  if (!review.clientId) missing.push("Linked client");
  if (!review.body.trim()) missing.push("Review body");
  if (review.showIdentity && !review.authorName?.trim())
    missing.push("Author name for visible identity");
  return missing;
}
