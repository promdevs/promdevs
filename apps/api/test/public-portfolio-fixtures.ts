import {
  publicProjectSchema,
  publicProjectSummarySchema,
  publicReviewSchema,
  projectDuration,
  type PublicPortfolioQuery,
  type AdminProject,
} from "@promdevs/contracts";
import type { PublicPortfolioStore } from "../src/public-portfolio.js";
import type { MemoryPortfolio } from "./portfolio-fixtures.js";
import type { MemoryCatalog } from "./catalog-fixtures.js";

// Isolated HTTP/browser fixtures only. Production reads explicit SQL allowlists.
export class MemoryPublicPortfolio implements PublicPortfolioStore {
  constructor(
    private portfolio: MemoryPortfolio,
    private catalog: MemoryCatalog,
  ) {}
  private projectData(p: AdminProject) {
    const c = p.clientId ? this.catalog.rows.clients.get(p.clientId) : null;
    return publicProjectSchema.parse({
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      category: p.category,
      year: p.year,
      productTypes: p.productTypes,
      platforms: p.platforms,
      coverImage: p.coverImage,
      coverAlt: p.coverAlt,
      featured: p.featured,
      publishedAt: p.publishedAt,
      status: p.status,
      roleSummary: p.roleSummary,
      services: p.services,
      builtWith: p.builtWith,
      tags: p.tags,
      problem: p.problem,
      approach: p.approach,
      solution: p.solution,
      results: p.results,
      gallery: p.gallery,
      liveUrl: p.liveUrl,
      appStoreUrl: p.appStoreUrl,
      playStoreUrl: p.playStoreUrl,
      githubUrl: p.githubUrl,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      socialImage: p.socialImage,
      duration: projectDuration(p.timeline),
      client:
        p.showClient && c && "publicName" in c && c.publicName
          ? { name: c.publicName, logo: c.logo, websiteUrl: c.websiteUrl }
          : null,
      skills: p.skillIds.flatMap((id) => {
        const s = this.catalog.rows.skills.get(id);
        return s && "slug" in s
          ? [
              {
                name: s.name,
                slug: s.slug,
                category: s.category,
                iconUrl: s.iconUrl,
              },
            ]
          : [];
      }),
    });
  }
  async projects({ limit, offset, featured }: PublicPortfolioQuery) {
    const rows = [...this.portfolio.rows.values()]
      .filter(
        (p) =>
          p.publicationStatus === "published" &&
          (featured === null || featured === p.featured),
      )
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          Number(b.featured) - Number(a.featured) ||
          b.id - a.id,
      );
    return {
      projects: rows
        .slice(offset, offset + limit)
        .map((p) => publicProjectSummarySchema.parse(this.projectData(p))),
      total: rows.length,
    };
  }
  async project(slug: string) {
    const p = [...this.portfolio.rows.values()].find(
      (p) => p.slug === slug && p.publicationStatus === "published",
    );
    return p ? this.projectData(p) : null;
  }
  async reviews({ limit, offset, featured }: PublicPortfolioQuery) {
    const rows = [...this.catalog.rows.reviews.values()].filter(
      (r) =>
        "publicationStatus" in r &&
        r.publicationStatus === "published" &&
        (featured === null || featured === r.featured),
    );
    const reviews = rows
      .flatMap((r) => {
        if (!("authorName" in r)) return [];
        const p = r.projectId ? this.portfolio.rows.get(r.projectId) : null;
        return [
          {
            sortOrder: r.sortOrder,
            record: publicReviewSchema.parse({
              id: r.id,
              title: r.title,
              body: r.body,
              rating: r.rating,
              reviewedAt: r.reviewedAt,
              source: r.source,
              sourceUrl: r.sourceUrl,
              featured: r.featured,
              author: r.showIdentity
                ? {
                    name: r.authorName,
                    role: r.authorRole,
                    company: r.authorCompany,
                    avatar: r.authorAvatar,
                  }
                : null,
              projectSlug: p?.publicationStatus === "published" ? p.slug : null,
            }),
          },
        ];
      })
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          Number(b.record.featured) - Number(a.record.featured) ||
          b.record.id - a.record.id,
      );
    return {
      reviews: reviews.slice(offset, offset + limit).map((r) => r.record),
      total: reviews.length,
    };
  }
}
