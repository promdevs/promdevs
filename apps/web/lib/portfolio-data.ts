import {
  publicProjectSchema,
  publicProjectSummarySchema,
  publicReviewSchema,
  type PublicProjectSummary,
} from "@promdevs/contracts";

type Resource = "projects" | "reviews";
type Fetcher = typeof fetch;
export type FeaturedWorkProject = PublicProjectSummary & { services: string[] };

export async function portfolioPage(
  base: string,
  resource: Resource,
  {
    limit = 100,
    offset = 0,
    featured,
  }: { limit?: number; offset?: number; featured?: boolean } = {},
  fetcher: Fetcher = fetch,
) {
  const url = new URL(`/api/portfolio/${resource}`, base);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (featured !== undefined)
    url.searchParams.set("featured", String(featured));
  const response = await fetcher(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(`Portfolio ${resource} unavailable (${response.status})`);
  const data = await response.json();
  if (
    !Number.isInteger(data.total) ||
    data.total < 0 ||
    data.limit !== limit ||
    data.offset !== offset
  )
    throw new Error("Invalid portfolio pagination");
  const items =
    resource === "projects"
      ? publicProjectSummarySchema.array().parse(data.projects)
      : publicReviewSchema.array().parse(data.reviews);
  if (items.length > limit || items.length > data.total)
    throw new Error("Invalid portfolio page");
  return { items, total: data.total as number };
}

export async function allProjects(
  base: string,
  fetcher: Fetcher = fetch,
  featured?: boolean,
): Promise<PublicProjectSummary[]> {
  const projects: PublicProjectSummary[] = [];
  let offset = 0;
  while (true) {
    const { items, total } = await portfolioPage(
      base,
      "projects",
      { offset, featured },
      fetcher,
    );
    projects.push(...(items as PublicProjectSummary[]));
    if (projects.length >= total) return projects;
    if (items.length === 0 || offset + items.length > 10000)
      throw new Error(
        "Portfolio pagination could not retrieve the complete catalog",
      );
    offset += items.length;
  }
}

export function featuredProjects(base: string, fetcher: Fetcher = fetch) {
  return allProjects(base, fetcher, true);
}

export async function featuredWorkProjects(
  base: string,
  fetcher: Fetcher = fetch,
): Promise<FeaturedWorkProject[]> {
  const projects = await featuredProjects(base, fetcher);
  const work: FeaturedWorkProject[] = [];
  // Bound detail requests while retaining the catalog's featured ordering.
  for (let offset = 0; offset < projects.length; offset += 4) {
    const batch = await Promise.all(
      projects.slice(offset, offset + 4).map(async (project) => {
        try {
          const detail = await projectBySlug(base, project.slug, fetcher);
          if (!detail || !detail.featured) return null;
          return { ...project, services: detail.services };
        } catch (error) {
          console.error(
            `[portfolio] Services unavailable for ${project.slug}:`,
            error instanceof Error ? error.message : "Unknown error",
          );
          return { ...project, services: [] };
        }
      }),
    );
    for (const project of batch) if (project) work.push(project);
  }
  return work;
}

export async function selectedPortfolio(
  base: string,
  resource: Resource,
  limit: number,
  fetcher: Fetcher = fetch,
) {
  const preferred = await portfolioPage(
    base,
    resource,
    { limit, featured: true },
    fetcher,
  );
  return preferred.items.length
    ? preferred.items
    : (await portfolioPage(base, resource, { limit }, fetcher)).items;
}

export async function projectBySlug(
  base: string,
  slug: string,
  fetcher: Fetcher = fetch,
) {
  const response = await fetcher(
    new URL(`/api/portfolio/projects/${encodeURIComponent(slug)}`, base),
    {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(
      `Project service temporarily unavailable (${response.status})`,
    );
  return publicProjectSchema.parse((await response.json()).project);
}
