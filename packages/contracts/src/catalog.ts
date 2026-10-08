import { z } from "zod";
import { projectHttpUrl } from "./portfolio.js";

export const catalogKinds = [
  "clients",
  "reviews",
  "skills",
  "contributors",
] as const;
export type CatalogKind = (typeof catalogKinds)[number];
export const CATALOG_ID_MAX = 2147483647;
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);
const name = z.string().trim().min(1).max(160);
const url = z
  .union([projectHttpUrl, z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
const email = z
  .union([z.email().max(320), z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);
const id = z
  .number()
  .int()
  .positive()
  .max(CATALOG_ID_MAX)
  .nullable()
  .default(null);
export const catalogVersionSchema = z
  .string()
  .datetime({ offset: true, local: true });
export const catalogInputs = {
  clients: z
    .object({
      name,
      clientType: z
        .enum(["organization", "individual"])
        .default("organization"),
      publicName: optionalText(160),
      industry: optionalText(160),
      websiteUrl: url,
      logo: url,
      contactName: optionalText(160),
      contactEmail: email,
      contactPhone: optionalText(80),
      notes: optionalText(10000),
    })
    .strict(),
  contributors: z
    .object({ name, contactEmail: email, notes: optionalText(10000) })
    .strict(),
  skills: z
    .object({
      name,
      slug: z
        .string()
        .trim()
        .max(160)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      category: name,
      iconUrl: url,
    })
    .strict(),
  reviews: z
    .object({
      clientId: id,
      projectId: id,
      title: optionalText(200),
      body: z.string().trim().max(16000).default(""),
      rating: z
        .number()
        .min(1)
        .max(5)
        .multipleOf(0.01)
        .nullable()
        .default(null),
      reviewedAt: z
        .string()
        .datetime({ offset: true })
        .nullable()
        .default(null),
      authorName: optionalText(160),
      authorRole: optionalText(160),
      authorCompany: optionalText(160),
      authorAvatar: url,
      showIdentity: z.boolean().default(false),
      source: z
        .string()
        .trim()
        .max(80)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .default("direct"),
      sourceUrl: url,
      externalId: optionalText(200),
      featured: z.boolean().default(false),
      sortOrder: z.number().int().min(0).max(1000000).default(0),
      internalNotes: optionalText(10000),
    })
    .strict()
    .refine((v) => !v.showIdentity || !!v.authorName, {
      path: ["authorName"],
      message: "Enter an author name before showing identity.",
    }),
};
export type CatalogInput = z.output<(typeof catalogInputs)[CatalogKind]>;
const common = {
  id: z.number().int().positive().max(CATALOG_ID_MAX),
  createdAt: catalogVersionSchema,
  updatedAt: catalogVersionSchema,
};
export const catalogRecordSchemas = {
  clients: catalogInputs.clients.safeExtend({
    ...common,
    status: z.enum(["active", "archived"]),
  }),
  contributors: catalogInputs.contributors.safeExtend({
    ...common,
    status: z.enum(["active", "archived"]),
  }),
  skills: catalogInputs.skills.safeExtend(common),
  reviews: catalogInputs.reviews.safeExtend({
    ...common,
    publicationStatus: z.enum(["draft", "published", "archived"]),
    publishedAt: z.string().nullable(),
  }),
};
export type CatalogRecord = z.output<
  (typeof catalogRecordSchemas)[CatalogKind]
>;
export const catalogSummarySchema = z.object({
  id: z.number().int().positive().max(CATALOG_ID_MAX),
  name: z.string(),
  detail: z.string(),
  state: z.string(),
  updatedAt: catalogVersionSchema,
  references: z.number().int().nonnegative(),
});
export const catalogListSchema = z.object({
  records: z.array(catalogSummarySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type CatalogSummary = z.infer<typeof catalogSummarySchema>;
export const catalogQuerySchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    state: z
      .enum(["all", "active", "draft", "published", "archived"])
      .default("all"),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
  })
  .strict();
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export const catalogStateSchema = z
  .object({
    state: z.enum(["active", "draft", "archived"]),
    expectedUpdatedAt: catalogVersionSchema,
  })
  .strict();
export const reviewOptionsSchema = z.object({
  clients: z.array(
    z.object({ id: z.number().int(), name: z.string(), status: z.string() }),
  ),
  projects: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      clientId: z.number().int().nullable(),
    }),
  ),
});
export type ReviewOptions = z.infer<typeof reviewOptionsSchema>;
