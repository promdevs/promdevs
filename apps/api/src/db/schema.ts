import { relations, sql, type SQL } from "drizzle-orm";
export * from "./admin-schema.js";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Canonical database schema; apply the reviewed migration before deploying the API.
export const publicationStatuses = ["draft", "published", "archived"] as const;
export const recordStatuses = ["active", "archived"] as const;
export const clientTypes = ["individual", "organization"] as const;
export const engagementTypes = [
  "client_work",
  "collaboration",
  "studio_product",
] as const;
export const workStatuses = ["in_progress", "completed", "ongoing"] as const;
export const productTypes = [
  "website",
  "web_app",
  "mobile_app",
  "ai_product",
] as const;
export const platforms = [
  "web",
  "ios",
  "android",
  "macos",
  "windows",
  "linux",
] as const;
export const startingPoints = [
  "idea",
  "prototype",
  "ai_generated_build",
  "unfinished_product",
  "established_product",
] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];
export type RecordStatus = (typeof recordStatuses)[number];
export type ClientType = (typeof clientTypes)[number];
export type EngagementType = (typeof engagementTypes)[number];
export type WorkStatus = (typeof workStatuses)[number];
export type ProductType = (typeof productTypes)[number];
export type Platform = (typeof platforms)[number];
export type StartingPoint = (typeof startingPoints)[number];

export type ProjectMedia = {
  type: "image" | "video";
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  poster?: string;
};

export type ProjectTimeline = {
  start_date?: string | null;
  end_date?: string | null;
  milestones?: { label: string; date?: string | null }[];
};

const literals = (values: readonly string[]) =>
  sql.join(
    // CHECK definitions need SQL literals, not prepared-statement parameters.
    values.map((value) => sql.raw(`'${value.replaceAll("'", "''")}'`)),
    sql`, `,
  );
const inValues = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} in (${literals(values)})`;
const arrayValues = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} <@ ARRAY[${literals(values)}]::text[] and array_position(${column}, null) is null`;
const nonBlank = (column: AnyPgColumn) => sql`length(btrim(${column})) > 0`;
const httpUrl = (column: AnyPgColumn) =>
  sql`${column} is null or ${column} ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$'`;
const auditColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const clients = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    clientType: text("client_type")
      .$type<ClientType>()
      .notNull()
      .default("organization"),
    publicName: text("public_name"),
    jobTitle: text("job_title"),
    industry: text("industry"),
    websiteUrl: text("website_url"),
    logo: text("logo"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    notes: text("notes"),
    status: text("status").$type<RecordStatus>().notNull().default("active"),
    ...auditColumns(),
  },
  (table) => [
    check("clients_name_nonblank", nonBlank(table.name)),
    check("clients_type_valid", inValues(table.clientType, clientTypes)),
    check("clients_status_valid", inValues(table.status, recordStatuses)),
    check("clients_website_url_valid", httpUrl(table.websiteUrl)),
    index("clients_status_idx").on(table.status),
  ],
);

// Existing physical columns/IDs remain available; status is the legacy work-status column.
export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").unique(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default(""),
    techStack: text("tech_stack")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    coverImage: text("cover_image"),
    liveUrl: text("live_url"),
    githubUrl: text("github_url"),
    featured: boolean("featured").notNull().default(false),
    status: text("status").$type<WorkStatus>().notNull().default("completed"),
    year: integer("year"),
    problem: text("problem"),
    solution: text("solution"),
    results: text("results"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    engagementType: text("engagement_type").$type<EngagementType>(),
    productTypes: text("product_types")
      .array()
      .$type<ProductType[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    platforms: text("platforms")
      .array()
      .$type<Platform[]>()
      .notNull()
      .default(sql`'{}'::text[]`),
    industry: text("industry"),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    showClient: boolean("show_client").notNull().default(false),
    roleSummary: text("role_summary"),
    services: text("services")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    startingPoint: text("starting_point").$type<StartingPoint>(),
    builtWith: text("built_with")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    approach: text("approach"),
    coverAlt: text("cover_alt"),
    gallery: jsonb("gallery")
      .$type<ProjectMedia[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    appStoreUrl: text("app_store_url"),
    playStoreUrl: text("play_store_url"),
    timeline: jsonb("timeline").$type<ProjectTimeline>(),
    publicationStatus: text("publication_status")
      .$type<PublicationStatus>()
      .notNull()
      .default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    socialImage: text("social_image"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    unique("projects_id_client_id_unique").on(table.id, table.clientId),
    check("projects_title_nonblank", nonBlank(table.title)),
    check(
      "projects_slug_valid",
      sql`${table.slug} is null or ${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "projects_engagement_type_valid",
      inValues(table.engagementType, engagementTypes),
    ),
    check("projects_work_status_valid", inValues(table.status, workStatuses)),
    check(
      "projects_publication_status_valid",
      inValues(table.publicationStatus, publicationStatuses),
    ),
    check(
      "projects_starting_point_valid",
      inValues(table.startingPoint, startingPoints),
    ),
    check(
      "projects_product_types_valid",
      arrayValues(table.productTypes, productTypes),
    ),
    check("projects_platforms_valid", arrayValues(table.platforms, platforms)),
    check(
      "projects_year_valid",
      sql`${table.year} is null or ${table.year} between 2000 and 2100`,
    ),
    check("projects_sort_order_valid", sql`${table.sortOrder} >= 0`),
    check("projects_live_url_valid", httpUrl(table.liveUrl)),
    check("projects_github_url_valid", httpUrl(table.githubUrl)),
    check(
      "projects_app_store_url_valid",
      sql`${table.appStoreUrl} is null or ${table.appStoreUrl} ~* '^https://(apps|itunes)\\.apple\\.com/([a-z]{2}/)?app/([^/?#[:space:]]+/)?id[0-9]+([/?#][^[:space:]]*)?$'`,
    ),
    check(
      "projects_play_store_url_valid",
      sql`${table.playStoreUrl} is null or ${table.playStoreUrl} ~* '^https://play\\.google\\.com/store/apps/details\\?([^#[:space:]]*&)?id=[^&#[:space:]]+(&[^#[:space:]]*)?(#[^[:space:]]*)?$'`,
    ),
    check(
      "projects_show_client_linked",
      sql`not ${table.showClient} or ${table.clientId} is not null`,
    ),
    check(
      "projects_gallery_valid",
      sql`case when jsonb_typeof(${table.gallery}) = 'array' then
    not jsonb_path_exists(${table.gallery}, '$[*] ? (@.type() != "object" || !exists(@.type) || !exists(@.src) || (@.type != "image" && @.type != "video") || @.src.type() != "string" || @.src == "")')
    else false end`,
    ),
    check("projects_timeline_valid", timelineCheck(table.timeline)),
    check(
      "projects_published_content_ready",
      sql`${table.publicationStatus} != 'published' or (
    ${table.slug} is not null and ${nonBlank(table.description)}
    and cardinality(${table.productTypes}) > 0
    and ${table.coverImage} is not null and ${nonBlank(table.coverImage)}
    and ${table.coverAlt} is not null and ${nonBlank(table.coverAlt)}
    and ${table.publishedAt} is not null
  )`,
    ),
    index("projects_client_id_idx").on(table.clientId),
    index("projects_public_listing_idx").on(
      table.publicationStatus,
      table.featured,
      table.sortOrder,
      table.id,
    ),
  ],
);

function timelineCheck(column: AnyPgColumn): SQL {
  // Guard casts with CASE: malformed calendar dates must never become valid timelines.
  return sql`case
    when ${column} is null then true
    when jsonb_typeof(${column}) != 'object' then false
    when (${column} - ARRAY['start_date', 'end_date', 'milestones']::text[]) != '{}'::jsonb then false
    when ${column}->'start_date' is not null and ${column}->'start_date' != 'null'::jsonb
      and (jsonb_typeof(${column}->'start_date') != 'string' or (${column}->>'start_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then false
    when ${column}->'end_date' is not null and ${column}->'end_date' != 'null'::jsonb
      and (jsonb_typeof(${column}->'end_date') != 'string' or (${column}->>'end_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then false
    when ${column}->'milestones' is not null and jsonb_typeof(${column}->'milestones') != 'array' then false
    else
      ((${column}->>'start_date') is null or to_char((${column}->>'start_date')::date, 'YYYY-MM-DD') = ${column}->>'start_date')
      and ((${column}->>'end_date') is null or to_char((${column}->>'end_date')::date, 'YYYY-MM-DD') = ${column}->>'end_date')
      and ((${column}->>'start_date')::date is null or (${column}->>'end_date')::date is null
        or (${column}->>'end_date')::date >= (${column}->>'start_date')::date)
      and not jsonb_path_exists(${column}, '$.milestones[*] ? (@.type() != "object" || !exists(@.label) || @.label.type() != "string" || @.label == "" || (exists(@.date) && @.date != null && (@.date.type() != "string" || !(@.date like_regex "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"))))')
  end`;
}

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    title: text("title"),
    body: text("body").notNull().default(""),
    rating: numeric("rating", { precision: 3, scale: 2, mode: "number" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    authorName: text("author_name"),
    authorRole: text("author_role"),
    authorCompany: text("author_company"),
    authorAvatar: text("author_avatar"),
    showIdentity: boolean("show_identity").notNull().default(false),
    source: text("source").notNull().default("direct"),
    sourceUrl: text("source_url"),
    externalId: text("external_id"),
    publicationStatus: text("publication_status")
      .$type<PublicationStatus>()
      .notNull()
      .default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    internalNotes: text("internal_notes"),
    ...auditColumns(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    // The composite FK also prevents reassignment of a project with attributed reviews.
    foreignKey({
      name: "reviews_project_client_fk",
      columns: [table.projectId, table.clientId],
      foreignColumns: [projects.id, projects.clientId],
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    check(
      "reviews_rating_valid",
      sql`${table.rating} is null or ${table.rating} between 1 and 5`,
    ),
    check(
      "reviews_source_valid",
      sql`${table.source} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check("reviews_source_url_valid", httpUrl(table.sourceUrl)),
    check(
      "reviews_external_id_nonblank",
      sql`${table.externalId} is null or ${nonBlank(table.externalId)}`,
    ),
    check(
      "reviews_named_identity_ready",
      sql`not ${table.showIdentity} or (${table.authorName} is not null and ${nonBlank(table.authorName)})`,
    ),
    check(
      "reviews_publication_status_valid",
      inValues(table.publicationStatus, publicationStatuses),
    ),
    check("reviews_sort_order_valid", sql`${table.sortOrder} >= 0`),
    check(
      "reviews_published_content_ready",
      sql`${table.publicationStatus} != 'published' or (
    ${table.clientId} is not null and ${nonBlank(table.body)}
    and ${table.publishedAt} is not null
  )`,
    ),
    uniqueIndex("reviews_source_external_id_unique")
      .on(table.source, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("reviews_client_id_idx").on(table.clientId),
    index("reviews_project_client_idx").on(table.projectId, table.clientId),
    index("reviews_public_listing_idx").on(
      table.publicationStatus,
      table.featured,
      table.sortOrder,
      table.id,
    ),
  ],
);

export const contributors = pgTable(
  "contributors",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    contactEmail: text("contact_email"),
    websiteUrl: text("website_url"),
    linkedinUrl: text("linkedin_url"),
    notes: text("notes"),
    status: text("status").$type<RecordStatus>().notNull().default("active"),
    ...auditColumns(),
  },
  (table) => [
    check("contributors_name_nonblank", nonBlank(table.name)),
    check("contributors_status_valid", inValues(table.status, recordStatuses)),
  ],
);

export const projectContributors = pgTable(
  "project_contributors",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    contributorId: integer("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "restrict" }),
    role: text("role"),
    notes: text("notes"),
  },
  (table) => [
    primaryKey({
      name: "project_contributors_pk",
      columns: [table.projectId, table.contributorId],
    }),
    index("project_contributors_contributor_id_idx").on(table.contributorId),
  ],
);

// Matches the supplied skills.csv columns; explicit imported IDs remain valid.
export const skills = pgTable(
  "skills",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    iconUrl: text("icon_url"),
    category: text("category").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("skills_name_nonblank", nonBlank(table.name)),
    check("skills_slug_valid", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("skills_category_nonblank", nonBlank(table.category)),
    check("skills_icon_url_valid", httpUrl(table.iconUrl)),
    index("skills_category_idx").on(table.category),
  ],
);

export const projectSkills = pgTable(
  "project_skills",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({
      name: "project_skills_pk",
      columns: [table.projectId, table.skillId],
    }),
    check("project_skills_sort_order_valid", sql`${table.sortOrder} >= 0`),
    index("project_skills_skill_id_idx").on(table.skillId),
  ],
);

export const clientsRelations = relations(clients, ({ many }) => ({
  projects: many(projects),
  reviews: many(reviews),
}));
export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  reviews: many(reviews),
  contributors: many(projectContributors),
  skills: many(projectSkills),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  client: one(clients, {
    fields: [reviews.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [reviews.projectId],
    references: [projects.id],
  }),
}));
export const contributorsRelations = relations(contributors, ({ many }) => ({
  projects: many(projectContributors),
}));
export const projectContributorsRelations = relations(
  projectContributors,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectContributors.projectId],
      references: [projects.id],
    }),
    contributor: one(contributors, {
      fields: [projectContributors.contributorId],
      references: [contributors.id],
    }),
  }),
);

export const skillsRelations = relations(skills, ({ many }) => ({
  projects: many(projectSkills),
}));
export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, {
    fields: [projectSkills.projectId],
    references: [projects.id],
  }),
  skill: one(skills, {
    fields: [projectSkills.skillId],
    references: [skills.id],
  }),
}));

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Contributor = typeof contributors.$inferSelect;
export type NewContributor = typeof contributors.$inferInsert;
export type ProjectContributor = typeof projectContributors.$inferSelect;
export type NewProjectContributor = typeof projectContributors.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type ProjectSkill = typeof projectSkills.$inferSelect;
export type NewProjectSkill = typeof projectSkills.$inferInsert;
