import "server-only";
import {
  projectResponseSchema,
  projectsResponseSchema,
} from "@promdevs/contracts";

export function apiUrl(path: string) {
  const base = process.env.API_BASE_URL || "http://127.0.0.1:4000";
  return new URL(path, base);
}

export async function getProjects() {
  try {
    const response = await fetch(apiUrl("/api/projects"), {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Project service unavailable");
    return projectsResponseSchema.parse(await response.json()).projects;
  } catch {
    // Preserve the existing contact invitation when portfolio data is unavailable.
    return [];
  }
}

export async function getProject(slug: string) {
  const response = await fetch(
    apiUrl(`/api/projects/${encodeURIComponent(slug)}`),
    { cache: "no-store", signal: AbortSignal.timeout(8000) },
  );
  if (response.status === 404) return null;
  // An outage must not masquerade as a permanent missing project to search engines.
  if (!response.ok)
    throw new Error("Project service is temporarily unavailable.");
  return projectResponseSchema.parse(await response.json()).project;
}
