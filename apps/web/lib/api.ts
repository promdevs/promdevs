import "server-only";
import { cache } from "react";
import type { PublicReview } from "@promdevs/contracts";
import {
  allProjects,
  featuredWorkProjects,
  type FeaturedWorkProject,
  projectBySlug,
  selectedPortfolio,
} from "./portfolio-data";

const apiBase = () => process.env.API_BASE_URL || "http://127.0.0.1:4000";

export function apiUrl(path: string) {
  return new URL(path, apiBase());
}

export async function getProjects() {
  try {
    return await allProjects(apiBase());
  } catch (error) {
    console.error(
      "[portfolio] Project catalog unavailable:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}

export async function getSelectedProjects(): Promise<FeaturedWorkProject[]> {
  try {
    return await featuredWorkProjects(apiBase());
  } catch (error) {
    console.error(
      "[portfolio] Selected work unavailable:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}

export async function getSelectedReviews(): Promise<PublicReview[]> {
  try {
    return (await selectedPortfolio(apiBase(), "reviews", 6)) as PublicReview[];
  } catch (error) {
    console.error(
      "[portfolio] Client stories unavailable:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return [];
  }
}

// Deduplicate metadata/page reads within a request, not across publications.
export const getProject = cache((slug: string) =>
  projectBySlug(apiBase(), slug),
);
