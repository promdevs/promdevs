import { z } from "zod";
import { projectMediaSchema } from "./portfolio.js";

const nullableText = z.string().nullable();
export const publicProjectSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  year: z.number().int().nullable(),
  productTypes: z.array(z.string()),
  platforms: z.array(z.string()),
  coverImage: z.string(),
  coverAlt: z.string(),
  featured: z.boolean(),
  publishedAt: z.string(),
});
export const publicProjectSchema = publicProjectSummarySchema.extend({
  status: z.string(),
  roleSummary: nullableText,
  services: z.array(z.string()),
  builtWith: z.array(z.string()),
  tags: z.array(z.string()),
  problem: nullableText,
  approach: nullableText,
  solution: nullableText,
  results: nullableText,
  gallery: z.array(projectMediaSchema),
  liveUrl: nullableText,
  appStoreUrl: nullableText,
  playStoreUrl: nullableText,
  githubUrl: nullableText,
  seoTitle: nullableText,
  seoDescription: nullableText,
  socialImage: nullableText,
  duration: nullableText,
  client: z
    .object({ name: z.string(), logo: nullableText, websiteUrl: nullableText })
    .nullable(),
  skills: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
      category: z.string(),
      iconUrl: nullableText,
    }),
  ),
});
export const publicReviewSchema = z.object({
  id: z.number().int().positive(),
  title: nullableText,
  body: z.string(),
  rating: z.number().nullable(),
  reviewedAt: nullableText,
  source: z.string(),
  sourceUrl: nullableText,
  featured: z.boolean(),
  author: z
    .object({
      name: z.string(),
      role: nullableText,
      company: nullableText,
      avatar: nullableText,
    })
    .nullable(),
  projectSlug: nullableText,
});
export const publicPortfolioQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
    featured: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? null : v === "true")),
  })
  .strict();
export type PublicPortfolioQuery = z.output<typeof publicPortfolioQuerySchema>;
export type PublicProjectSummary = z.infer<typeof publicProjectSummarySchema>;
export type PublicProject = z.infer<typeof publicProjectSchema>;
export type PublicReview = z.infer<typeof publicReviewSchema>;
