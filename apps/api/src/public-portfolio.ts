import { neon } from "@neondatabase/serverless";
import {
  publicProjectSchema,
  publicProjectSummarySchema,
  publicReviewSchema,
  type PublicPortfolioQuery,
  type PublicProject,
  type PublicProjectSummary,
  type PublicReview,
} from "@promdevs/contracts";
import { HttpError } from "./errors.js";

export interface PublicPortfolioStore {
  projects(
    query: PublicPortfolioQuery,
  ): Promise<{ projects: PublicProjectSummary[]; total: number }>;
  project(slug: string): Promise<PublicProject | null>;
  reviews(
    query: PublicPortfolioQuery,
  ): Promise<{ reviews: PublicReview[]; total: number }>;
}
const columns = {
  id: "id",
  title: "title",
  slug: "slug",
  description: "description",
  category: "category",
  year: "year",
  productTypes: "product_types",
  platforms: "platforms",
  coverImage: "cover_image",
  coverAlt: "cover_alt",
  featured: "featured",
  publishedAt: "published_at",
  status: "status",
  roleSummary: "role_summary",
  services: "services",
  builtWith: "built_with",
  tags: "tags",
  problem: "problem",
  approach: "approach",
  solution: "solution",
  results: "results",
  gallery: "gallery",
  liveUrl: "live_url",
  appStoreUrl: "app_store_url",
  playStoreUrl: "play_store_url",
  githubUrl: "github_url",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  socialImage: "social_image",
} as const;
const jsonFields = (fields: string[], alias: string) =>
  fields
    .map(
      (field) =>
        `'${field}',${field === "tags" ? `coalesce(${alias}.tags,ARRAY[]::text[])` : `${alias}.${columns[field as keyof typeof columns]}`}`,
    )
    .join(",");
const summary = jsonFields(Object.keys(publicProjectSummarySchema.shape), "p");
const detail = jsonFields(Object.keys(columns), "p");

export const publicProjectsSql = `WITH visible AS(SELECT * FROM projects WHERE publication_status='published' AND ($3::boolean IS NULL OR featured=$3)),page AS(SELECT * FROM visible ORDER BY sort_order ASC,featured DESC,id DESC LIMIT $1 OFFSET $2)
 SELECT coalesce((SELECT jsonb_agg(jsonb_build_object(${summary}) ORDER BY p.sort_order ASC,p.featured DESC,p.id DESC) FROM page p),'[]'::jsonb) projects,(SELECT count(*)::int FROM visible) total`;

export const publicProjectSql = `SELECT jsonb_build_object(${detail},
 'duration',CASE WHEN p.timeline->>'start_date' IS NOT NULL AND p.timeline->>'end_date' IS NOT NULL THEN
   CASE WHEN (p.timeline->>'end_date')::date-(p.timeline->>'start_date')::date<7 THEN ((p.timeline->>'end_date')::date-(p.timeline->>'start_date')::date)::text || CASE WHEN (p.timeline->>'end_date')::date-(p.timeline->>'start_date')::date=1 THEN ' day' ELSE ' days' END
   ELSE ceil(((p.timeline->>'end_date')::date-(p.timeline->>'start_date')::date)::numeric/7)::text || CASE WHEN ceil(((p.timeline->>'end_date')::date-(p.timeline->>'start_date')::date)::numeric/7)=1 THEN ' week' ELSE ' weeks' END END ELSE NULL END,
 'client',CASE WHEN p.show_client THEN (SELECT jsonb_build_object('name',c.public_name,'logo',c.logo,'websiteUrl',c.website_url) FROM clients c WHERE c.id=p.client_id AND nullif(btrim(c.public_name),'') IS NOT NULL) ELSE NULL END,
 'skills',coalesce((SELECT jsonb_agg(jsonb_build_object('name',s.name,'slug',s.slug,'category',s.category,'iconUrl',s.icon_url) ORDER BY ps.sort_order,s.id) FROM project_skills ps JOIN skills s ON s.id=ps.skill_id WHERE ps.project_id=p.id),'[]'::jsonb)
 ) project FROM projects p WHERE p.slug=$1 AND p.publication_status='published'`;

export const publicReviewsSql = `WITH visible AS(SELECT * FROM reviews WHERE publication_status='published' AND ($3::boolean IS NULL OR featured=$3)),page AS(SELECT * FROM visible ORDER BY sort_order ASC,featured DESC,id DESC LIMIT $1 OFFSET $2)
 SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'body',r.body,'rating',r.rating::float8,'reviewedAt',r.reviewed_at,'source',r.source,'sourceUrl',r.source_url,'featured',r.featured,
 'author',CASE WHEN r.show_identity THEN jsonb_build_object('name',r.author_name,'role',r.author_role,'company',r.author_company,'avatar',r.author_avatar) ELSE NULL END,
 'projectSlug',(SELECT p.slug FROM projects p WHERE p.id=r.project_id AND p.publication_status='published')) ORDER BY r.sort_order ASC,r.featured DESC,r.id DESC) FROM page r),'[]'::jsonb) reviews,(SELECT count(*)::int FROM visible) total`;

function query() {
  if (!process.env.DATABASE_URL)
    throw new HttpError(503, "Public portfolio storage is not configured.");
  return neon(process.env.DATABASE_URL);
}
export const databasePublicPortfolioStore: PublicPortfolioStore = {
  async projects({ limit, offset, featured }) {
    const [row] = await query().query(publicProjectsSql, [
      limit,
      offset,
      featured,
    ]);
    return {
      projects: row.projects.map((p: unknown) =>
        publicProjectSummarySchema.parse(p),
      ),
      total: row.total,
    };
  },
  async project(slug) {
    const [row] = await query().query(publicProjectSql, [slug]);
    return row ? publicProjectSchema.parse(row.project) : null;
  },
  async reviews({ limit, offset, featured }) {
    const [row] = await query().query(publicReviewsSql, [
      limit,
      offset,
      featured,
    ]);
    return {
      reviews: row.reviews.map((r: unknown) => publicReviewSchema.parse(r)),
      total: row.total,
    };
  },
};
