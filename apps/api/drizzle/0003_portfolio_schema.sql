CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"client_type" text DEFAULT 'organization' NOT NULL,
	"public_name" text,
	"industry" text,
	"website_url" text,
	"logo" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_name_nonblank" CHECK (length(btrim("clients"."name")) > 0),
	CONSTRAINT "clients_type_valid" CHECK ("clients"."client_type" in ('individual', 'organization')),
	CONSTRAINT "clients_status_valid" CHECK ("clients"."status" in ('active', 'archived')),
	CONSTRAINT "clients_website_url_valid" CHECK ("clients"."website_url" is null or "clients"."website_url" ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$')
);
--> statement-breakpoint
CREATE TABLE "contributors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributors_name_nonblank" CHECK (length(btrim("contributors"."name")) > 0),
	CONSTRAINT "contributors_status_valid" CHECK ("contributors"."status" in ('active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "project_contributors" (
	"project_id" integer NOT NULL,
	"contributor_id" integer NOT NULL,
	"role" text,
	"notes" text,
	CONSTRAINT "project_contributors_pk" PRIMARY KEY("project_id","contributor_id")
);
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"project_id" integer NOT NULL,
	"skill_id" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "project_skills_pk" PRIMARY KEY("project_id","skill_id"),
	CONSTRAINT "project_skills_sort_order_valid" CHECK ("project_skills"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"project_id" integer,
	"title" text,
	"body" text DEFAULT '' NOT NULL,
	"rating" numeric(3, 2),
	"reviewed_at" timestamp with time zone,
	"author_name" text,
	"author_role" text,
	"author_company" text,
	"author_avatar" text,
	"show_identity" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'direct' NOT NULL,
	"source_url" text,
	"external_id" text,
	"publication_status" text DEFAULT 'draft' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "reviews_rating_valid" CHECK ("reviews"."rating" is null or "reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_source_valid" CHECK ("reviews"."source" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "reviews_source_url_valid" CHECK ("reviews"."source_url" is null or "reviews"."source_url" ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
	CONSTRAINT "reviews_external_id_nonblank" CHECK ("reviews"."external_id" is null or length(btrim("reviews"."external_id")) > 0),
	CONSTRAINT "reviews_named_identity_ready" CHECK (not "reviews"."show_identity" or ("reviews"."author_name" is not null and length(btrim("reviews"."author_name")) > 0)),
	CONSTRAINT "reviews_publication_status_valid" CHECK ("reviews"."publication_status" in ('draft', 'published', 'archived')),
	CONSTRAINT "reviews_sort_order_valid" CHECK ("reviews"."sort_order" >= 0),
	CONSTRAINT "reviews_published_content_ready" CHECK ("reviews"."publication_status" != 'published' or (
    "reviews"."client_id" is not null and length(btrim("reviews"."body")) > 0
    and "reviews"."published_at" is not null
  ))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon_url" text,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug"),
	CONSTRAINT "skills_name_nonblank" CHECK (length(btrim("skills"."name")) > 0),
	CONSTRAINT "skills_slug_valid" CHECK ("skills"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "skills_category_nonblank" CHECK (length(btrim("skills"."category")) > 0),
	CONSTRAINT "skills_icon_url_valid" CHECK ("skills"."icon_url" is null or "skills"."icon_url" ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$')
);
--> statement-breakpoint
ALTER TABLE "demo_users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "demo_users" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "description" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "category" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "tech_stack" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "engagement_type" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "product_types" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "platforms" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "show_client" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "role_summary" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "services" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "starting_point" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "built_with" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "approach" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "cover_alt" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "app_store_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "play_store_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "timeline" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "publication_status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "social_image" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_contributors" ADD CONSTRAINT "project_contributors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributors" ADD CONSTRAINT "project_contributors_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_client_id_unique" UNIQUE("id","client_id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_client_fk" FOREIGN KEY ("project_id","client_id") REFERENCES "public"."projects"("id","client_id") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_contributors_contributor_id_idx" ON "project_contributors" USING btree ("contributor_id");--> statement-breakpoint
CREATE INDEX "project_skills_skill_id_idx" ON "project_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_source_external_id_unique" ON "reviews" USING btree ("source","external_id") WHERE "reviews"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "reviews_client_id_idx" ON "reviews" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "reviews_project_client_idx" ON "reviews" USING btree ("project_id","client_id");--> statement-breakpoint
CREATE INDEX "reviews_public_listing_idx" ON "reviews" USING btree ("publication_status","featured","sort_order","id");--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_client_id_idx" ON "projects" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "projects_public_listing_idx" ON "projects" USING btree ("publication_status","featured","sort_order","id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_title_nonblank" CHECK (length(btrim("projects"."title")) > 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_slug_valid" CHECK ("projects"."slug" is null or "projects"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_engagement_type_valid" CHECK ("projects"."engagement_type" in ('client_work', 'collaboration', 'studio_product'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_work_status_valid" CHECK ("projects"."status" in ('in_progress', 'completed', 'ongoing'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_publication_status_valid" CHECK ("projects"."publication_status" in ('draft', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_starting_point_valid" CHECK ("projects"."starting_point" in ('idea', 'prototype', 'ai_generated_build', 'unfinished_product', 'established_product'));--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_product_types_valid" CHECK ("projects"."product_types" <@ ARRAY['website', 'web_app', 'mobile_app', 'ai_product']::text[] and array_position("projects"."product_types", null) is null);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_platforms_valid" CHECK ("projects"."platforms" <@ ARRAY['web', 'ios', 'android', 'macos', 'windows', 'linux']::text[] and array_position("projects"."platforms", null) is null);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_year_valid" CHECK ("projects"."year" is null or "projects"."year" between 2000 and 2100);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sort_order_valid" CHECK ("projects"."sort_order" >= 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_live_url_valid" CHECK ("projects"."live_url" is null or "projects"."live_url" ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_github_url_valid" CHECK ("projects"."github_url" is null or "projects"."github_url" ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_app_store_url_valid" CHECK ("projects"."app_store_url" is null or "projects"."app_store_url" ~* '^https://(apps|itunes)\.apple\.com/([a-z]{2}/)?app/([^/?#[:space:]]+/)?id[0-9]+([/?#][^[:space:]]*)?$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_play_store_url_valid" CHECK ("projects"."play_store_url" is null or "projects"."play_store_url" ~* '^https://play\.google\.com/store/apps/details\?([^#[:space:]]*&)?id=[^&#[:space:]]+(&[^#[:space:]]*)?(#[^[:space:]]*)?$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_show_client_linked" CHECK (not "projects"."show_client" or "projects"."client_id" is not null);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_gallery_valid" CHECK (case when jsonb_typeof("projects"."gallery") = 'array' then
    not jsonb_path_exists("projects"."gallery", '$[*] ? (@.type() != "object" || !exists(@.type) || !exists(@.src) || (@.type != "image" && @.type != "video") || @.src.type() != "string" || @.src == "")')
    else false end);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_timeline_valid" CHECK (case
    when "projects"."timeline" is null then true
    when jsonb_typeof("projects"."timeline") != 'object' then false
    when ("projects"."timeline" - ARRAY['start_date', 'end_date', 'milestones']::text[]) != '{}'::jsonb then false
    when "projects"."timeline"->'start_date' is not null and "projects"."timeline"->'start_date' != 'null'::jsonb
      and (jsonb_typeof("projects"."timeline"->'start_date') != 'string' or ("projects"."timeline"->>'start_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then false
    when "projects"."timeline"->'end_date' is not null and "projects"."timeline"->'end_date' != 'null'::jsonb
      and (jsonb_typeof("projects"."timeline"->'end_date') != 'string' or ("projects"."timeline"->>'end_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then false
    when "projects"."timeline"->'milestones' is not null and jsonb_typeof("projects"."timeline"->'milestones') != 'array' then false
    else
      (("projects"."timeline"->>'start_date') is null or to_char(("projects"."timeline"->>'start_date')::date, 'YYYY-MM-DD') = "projects"."timeline"->>'start_date')
      and (("projects"."timeline"->>'end_date') is null or to_char(("projects"."timeline"->>'end_date')::date, 'YYYY-MM-DD') = "projects"."timeline"->>'end_date')
      and (("projects"."timeline"->>'start_date')::date is null or ("projects"."timeline"->>'end_date')::date is null
        or ("projects"."timeline"->>'end_date')::date >= ("projects"."timeline"->>'start_date')::date)
      and not jsonb_path_exists("projects"."timeline", '$.milestones[*] ? (@.type() != "object" || !exists(@.label) || @.label.type() != "string" || @.label == "" || (exists(@.date) && @.date != null && (@.date.type() != "string" || !(@.date like_regex "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"))))')
  end);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_published_content_ready" CHECK ("projects"."publication_status" != 'published' or (
    "projects"."slug" is not null and length(btrim("projects"."description")) > 0
    and cardinality("projects"."product_types") > 0
    and "projects"."cover_image" is not null and length(btrim("projects"."cover_image")) > 0
    and "projects"."cover_alt" is not null and length(btrim("projects"."cover_alt")) > 0
    and "projects"."published_at" is not null
  ));