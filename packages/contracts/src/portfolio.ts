import { z } from "zod";

export const productTypes = [
  "website",
  "web_app",
  "mobile_app",
  "ai_product",
] as const;
export const projectPlatforms = [
  "web",
  "ios",
  "android",
  "macos",
  "windows",
  "linux",
] as const;
export const workStatuses = ["in_progress", "completed", "ongoing"] as const;
export const publicationStatuses = ["draft", "published", "archived"] as const;
export const engagementTypes = [
  "client_work",
  "collaboration",
  "studio_product",
] as const;
export const startingPoints = [
  "idea",
  "prototype",
  "ai_generated_build",
  "unfinished_product",
  "established_product",
] as const;
export const serviceChoices = [
  "product_design",
  "frontend_development",
  "backend_development",
  "mobile_development",
  "ai_development",
  "app_rescue",
  "migrations",
  "qa_performance",
  "deployment",
] as const;
export const aiToolChoices = [
  "replit",
  "lovable",
  "base44",
  "claude",
  "codex",
  "cursor",
  "bolt",
  "v0",
] as const;
export const MAX_PROJECT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PROJECT_VIDEO_BYTES = 50 * 1024 * 1024;
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);
const cleanName = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (v) => !/[\p{Cc}\p{Cf}]/u.test(v),
    "Remove control characters from the name",
  );
export const projectHttpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (
        ["http:", "https:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  }, "Use an HTTP(S) URL without credentials");
const url = z
  .union([projectHttpUrl, z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
const image = z
  .union([
    projectHttpUrl,
    z
      .string()
      .regex(/^\/(?!\/)[a-zA-Z0-9/_.,@-]+$/)
      .refine((v) => !v.includes("..")),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((v) => v || null);
const keys = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/),
  )
  .max(30)
  .default([])
  .refine((v) => new Set(v).size === v.length, "Remove duplicate choices");
const uniqueIds = z
  .array(z.number().int().positive())
  .max(60)
  .default([])
  .refine((v) => new Set(v).size === v.length, "Remove duplicate skills");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Use a real calendar date");
export const projectTimelineSchema = z
  .object({
    start_date: date.nullable().optional(),
    end_date: date.nullable().optional(),
    milestones: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(160),
            date: date.nullable().optional(),
          })
          .strict(),
      )
      .max(30)
      .optional(),
  })
  .strict()
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    "End date must not precede start date",
  );
export const projectMediaSchema = z
  .object({
    type: z.enum(["image", "video"]),
    src: projectHttpUrl,
    alt: z.string().trim().max(300).optional(),
    caption: z.string().trim().max(600).optional(),
    width: z.number().int().positive().max(16384).optional(),
    height: z.number().int().positive().max(16384).optional(),
    poster: image,
  })
  .strict();
export const projectContributorSchema = z
  .object({
    contributorId: z.number().int().positive(),
    role: text(160),
    notes: text(2000),
  })
  .strict();
const appleUrl = url.refine(
  (v) =>
    !v ||
    /^https:\/\/(apps|itunes)\.apple\.com\/([a-z]{2}\/)?app\/([^/?#\s]+\/)?id\d+([/?#][^\s]*)?$/i.test(
      v,
    ),
  "Use an Apple App Store listing URL",
);
const googleUrl = url.refine((v) => {
  if (!v) return true;
  const u = new URL(v);
  return (
    u.protocol === "https:" &&
    u.hostname === "play.google.com" &&
    u.pathname === "/store/apps/details" &&
    !!u.searchParams.get("id")
  );
}, "Use a Google Play app listing URL");
export const draftProjectInputSchema = z
  .object({
    title: cleanName,
    slug: text(160).refine(
      (v) => !v || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v),
      "Use lowercase words separated by hyphens",
    ),
    description: z.string().trim().max(2000).default(""),
    category: z.string().trim().max(100).default(""),
    year: z.number().int().min(2000).max(2100).nullable().default(null),
    status: z.enum(workStatuses).default("completed"),
    engagementType: z.enum(engagementTypes).nullable().default(null),
    productTypes: z.array(z.enum(productTypes)).max(4).default([]),
    platforms: z.array(z.enum(projectPlatforms)).max(6).default([]),
    industry: text(160),
    clientId: z.number().int().positive().nullable().default(null),
    showClient: z.boolean().default(false),
    roleSummary: text(2000),
    services: keys,
    startingPoint: z.enum(startingPoints).nullable().default(null),
    builtWith: keys,
    skillIds: uniqueIds,
    contributors: z
      .array(projectContributorSchema)
      .max(30)
      .default([])
      .refine(
        (v) => new Set(v.map((c) => c.contributorId)).size === v.length,
        "Remove duplicate contributors",
      ),
    tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    problem: text(12000),
    approach: text(12000),
    solution: text(12000),
    results: text(12000),
    coverImage: image,
    coverAlt: text(300),
    gallery: z.array(projectMediaSchema).max(30).default([]),
    liveUrl: url,
    appStoreUrl: appleUrl,
    playStoreUrl: googleUrl,
    githubUrl: url,
    timeline: projectTimelineSchema.nullable().default(null),
    featured: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(1000000).default(0),
    seoTitle: text(160),
    seoDescription: text(500),
    socialImage: image,
  })
  .strict()
  .refine(
    (v) => !v.showClient || v.clientId !== null,
    "Link a client before enabling client display",
  );
export type DraftProjectInput = z.infer<typeof draftProjectInputSchema>;
export const adminProjectSchema = draftProjectInputSchema.safeExtend({
  id: z.number().int().positive(),
  publicationStatus: z.enum(publicationStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  techStack: z.array(z.string()),
});
export type AdminProject = z.infer<typeof adminProjectSchema>;
export const draftProjectUpdateSchema = z
  .object({
    project: draftProjectInputSchema,
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const projectStateInputSchema = z
  .object({
    state: z.enum(["draft", "archived"]),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export const projectSummarySchema = z.object(adminProjectSchema.shape).pick({
  id: true,
  title: true,
  slug: true,
  description: true,
  category: true,
  year: true,
  status: true,
  productTypes: true,
  publicationStatus: true,
  coverImage: true,
  featured: true,
  sortOrder: true,
  updatedAt: true,
  createdAt: true,
});
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export const portfolioQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    state: z.enum(["all", ...publicationStatuses]).default("all"),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const portfolioListSchema = z.object({
  projects: z.array(projectSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export const adminProjectResponseSchema = z.object({
  project: adminProjectSchema,
});
export const quickClientInputSchema = z
  .object({
    name: cleanName,
    clientType: z.enum(["individual", "organization"]).default("organization"),
    publicName: text(160),
    industry: text(160),
    websiteUrl: url,
  })
  .strict();
export const quickContributorInputSchema = z
  .object({ name: cleanName })
  .strict();
const reference = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  status: z.enum(["active", "archived"]),
});
export const portfolioOptionsSchema = z.object({
  skills: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      slug: z.string(),
      category: z.string(),
      iconUrl: z.string().nullable(),
    }),
  ),
  clients: z.array(
    reference.extend({
      publicName: z.string().nullable(),
      clientType: z.enum(["individual", "organization"]),
    }),
  ),
  contributors: z.array(reference),
});
export type PortfolioOptions = z.infer<typeof portfolioOptionsSchema>;
export const projectUploadSchema = z.object({
  type: z.enum(["image", "video"]),
  src: projectHttpUrl,
  key: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.number().int().positive(),
  contentType: z.string(),
});
export type ProjectUpload = z.infer<typeof projectUploadSchema>;
export function projectDuration(
  timeline: DraftProjectInput["timeline"],
): string | null {
  if (!timeline?.start_date || !timeline.end_date) return null;
  const days = Math.round(
    (Date.parse(timeline.end_date) - Date.parse(timeline.start_date)) /
      86400000,
  );
  return days < 7
    ? `${days} ${days === 1 ? "day" : "days"}`
    : `${Math.ceil(days / 7)} ${Math.ceil(days / 7) === 1 ? "week" : "weeks"}`;
}
export function destinationKind(
  value: string,
): "web" | "app_store" | "play_store" {
  try {
    const u = new URL(value);
    if (
      (u.hostname === "apps.apple.com" || u.hostname === "itunes.apple.com") &&
      /\/app\/(?:[^/]+\/)?id\d+/.test(u.pathname)
    )
      return "app_store";
    if (
      u.hostname === "play.google.com" &&
      u.pathname === "/store/apps/details" &&
      u.searchParams.get("id")
    )
      return "play_store";
  } catch {
    /* Incomplete form input is not a classified URL. */
  }
  return "web";
}
