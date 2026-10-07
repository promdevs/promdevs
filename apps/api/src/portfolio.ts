import { neon } from "@neondatabase/serverless";
import {
  adminProjectSchema,
  portfolioOptionsSchema,
  projectSummarySchema,
  type AdminProject,
  type DraftProjectInput,
  type PortfolioOptions,
  type ProjectSummary,
} from "@promdevs/contracts";
import type { AuthIdentity } from "./access-control/auth-store.js";
import { HttpError } from "./errors.js";

export type PortfolioQuery = {
  q: string;
  state: string;
  limit: number;
  offset: number;
};
export interface PortfolioStore {
  list(
    query: PortfolioQuery,
  ): Promise<{ projects: ProjectSummary[]; total: number }>;
  get(id: number): Promise<AdminProject | null>;
  save(
    actor: AuthIdentity,
    input: DraftProjectInput,
    id?: number,
    expected?: string,
  ): Promise<AdminProject>;
  state(
    actor: AuthIdentity,
    id: number,
    state: "draft" | "archived",
    expected: string,
  ): Promise<AdminProject>;
  options(): Promise<PortfolioOptions>;
  quickCreate(
    actor: AuthIdentity,
    kind: "clients" | "contributors",
    input: Record<string, unknown>,
  ): Promise<number>;
  auditUpload(actor: AuthIdentity, id: number, key: string): Promise<void>;
}
const columns = {
  title: "title",
  slug: "slug",
  description: "description",
  category: "category",
  year: "year",
  status: "status",
  engagementType: "engagement_type",
  productTypes: "product_types",
  platforms: "platforms",
  industry: "industry",
  clientId: "client_id",
  showClient: "show_client",
  roleSummary: "role_summary",
  services: "services",
  startingPoint: "starting_point",
  builtWith: "built_with",
  tags: "tags",
  problem: "problem",
  approach: "approach",
  solution: "solution",
  results: "results",
  coverImage: "cover_image",
  coverAlt: "cover_alt",
  gallery: "gallery",
  liveUrl: "live_url",
  appStoreUrl: "app_store_url",
  playStoreUrl: "play_store_url",
  githubUrl: "github_url",
  timeline: "timeline",
  featured: "featured",
  sortOrder: "sort_order",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
  socialImage: "social_image",
} as const;
const fields = {
  ...columns,
  id: "id",
  publicationStatus: "publication_status",
  createdAt: "created_at",
  updatedAt: "updated_at",
  publishedAt: "published_at",
  techStack: "tech_stack",
};
const rowJson = (alias: string) =>
  `jsonb_build_object(${Object.entries(fields)
    .map(([key, col]) => `'${key}', ${alias}.${col}`)
    .join(",")})`;
const summaryJson = (alias: string) =>
  `jsonb_build_object(${Object.keys(projectSummarySchema.shape)
    .map((key) => `'${key}', ${alias}.${fields[key as keyof typeof fields]}`)
    .join(",")})`;
const skillsJson = (alias: string) =>
  `coalesce((SELECT jsonb_agg(skill_id ORDER BY sort_order,skill_id) FROM project_skills WHERE project_id=${alias}.id),'[]'::jsonb)`;
const contributorsJson = (alias: string) =>
  `coalesce((SELECT jsonb_agg(jsonb_build_object('contributorId',contributor_id,'role',role,'notes',notes) ORDER BY contributor_id) FROM project_contributors WHERE project_id=${alias}.id),'[]'::jsonb)`;
const actorCte = `actor AS MATERIALIZED (SELECT id, role FROM admin_users WHERE id=$1::uuid AND auth_version=$2::int AND status='active' FOR SHARE)`;
const readJson = (alias: string) =>
  `${rowJson(alias)} || jsonb_build_object('skillIds',${skillsJson(alias)},'contributors',${contributorsJson(alias)})`;
function payload(input: DraftProjectInput) {
  return Object.fromEntries(
    Object.entries(columns).map(([key, col]) => [
      col,
      input[key as keyof typeof columns],
    ]),
  );
}
function query() {
  if (!process.env.DATABASE_URL)
    throw new HttpError(503, "Project storage is not configured.");
  return neon(process.env.DATABASE_URL);
}
function outcome(value: string) {
  if (value === "forbidden")
    throw new HttpError(403, "Your account cannot change this project.");
  if (value === "missing") throw new HttpError(404, "Project not found.");
  if (value === "conflict")
    throw new HttpError(
      409,
      "This project changed since you opened it. Reload before saving; your unsaved work has not been overwritten.",
    );
  if (value === "readonly")
    throw new HttpError(
      409,
      "Only draft projects can be edited. Publishing is deferred in this release.",
    );
  if (value === "relations")
    throw new HttpError(
      400,
      "Choose existing active clients, skills, and contributors. Archived relationships can be retained, not newly linked.",
    );
  if (value !== "ok")
    throw new HttpError(503, "Project management is temporarily unavailable.");
}
const allowedRelations = `
  (r.client_id IS NULL OR EXISTS (SELECT 1 FROM clients WHERE id=r.client_id AND (status='active' OR id=(SELECT client_id FROM target))))
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text($6::jsonb) ids WHERE NOT EXISTS (SELECT 1 FROM skills WHERE id=ids.value::int))
  AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements($7::jsonb) entries WHERE NOT EXISTS (SELECT 1 FROM contributors c WHERE c.id=(entries->>'contributorId')::int AND (c.status='active' OR EXISTS (SELECT 1 FROM project_contributors pc WHERE pc.project_id=$4::int AND pc.contributor_id=c.id))))`;

export function portfolioSaveSql(create: boolean) {
  const change = create
    ? `INSERT INTO projects (${Object.values(columns).join(",")},tech_stack)
      SELECT ${Object.values(columns)
        .map((c) => `r.${c}`)
        .join(
          ",",
        )}, ARRAY(SELECT s.name FROM jsonb_array_elements_text($6::jsonb) WITH ORDINALITY ids(value,rank) JOIN skills s ON s.id=ids.value::int ORDER BY ids.rank)
      FROM input r WHERE (SELECT outcome FROM decision)='ok' RETURNING *`
    : `UPDATE projects p SET ${Object.values(columns)
        .map((c) => `${c}=r.${c}`)
        .join(",")},
      tech_stack=CASE WHEN jsonb_array_length($6::jsonb)>0 OR EXISTS(SELECT 1 FROM project_skills WHERE project_id=p.id)
      THEN ARRAY(SELECT s.name FROM jsonb_array_elements_text($6::jsonb) WITH ORDINALITY ids(value,rank) JOIN skills s ON s.id=ids.value::int ORDER BY ids.rank) ELSE p.tech_stack END,
      updated_at=clock_timestamp() FROM input r WHERE p.id=$4::int AND (SELECT outcome FROM decision)='ok' RETURNING p.*`;
  return `WITH ${actorCte}, target AS MATERIALIZED (SELECT * FROM projects WHERE id=$4::int FOR UPDATE),
  input AS (SELECT * FROM jsonb_populate_record(NULL::projects,$3::jsonb)),
  decision AS (SELECT CASE
    WHEN NOT EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin','editor')) THEN 'forbidden'
    ${
      create
        ? `WHEN $4::int IS NOT NULL OR $5::text IS NOT NULL THEN 'conflict'`
        : `WHEN NOT EXISTS(SELECT 1 FROM target) THEN 'missing'
    WHEN (SELECT publication_status FROM target)!='draft' THEN 'readonly'
    WHEN (SELECT updated_at FROM target)!=$5::timestamptz THEN 'conflict'`
    }
    WHEN NOT (${allowedRelations}) THEN 'relations' ELSE 'ok' END AS outcome FROM input r),
  changed AS (${change}),
  old_skills AS (DELETE FROM project_skills WHERE project_id IN (SELECT id FROM changed) RETURNING project_id),
  new_skills AS (INSERT INTO project_skills (project_id,skill_id,sort_order)
    SELECT c.id, ids.value::int, ids.rank::int-1 FROM changed c CROSS JOIN jsonb_array_elements_text($6::jsonb) WITH ORDINALITY ids(value,rank)
    WHERE (SELECT count(*) FROM old_skills)>=0),
  old_team AS (DELETE FROM project_contributors WHERE project_id IN (SELECT id FROM changed) RETURNING project_id),
  new_team AS (INSERT INTO project_contributors (project_id,contributor_id,role,notes)
    SELECT c.id,(entry->>'contributorId')::int,entry->>'role',entry->>'notes' FROM changed c CROSS JOIN jsonb_array_elements($7::jsonb) entry
    WHERE (SELECT count(*) FROM old_team)>=0),
  audited AS (INSERT INTO admin_audit_logs (actor_id,action,target_type,target_id)
    SELECT $1::uuid,'project.${create ? "created" : "updated"}','project',id::text FROM changed)
  SELECT outcome,(SELECT ${rowJson("c")} || jsonb_build_object('skillIds',$6::jsonb,'contributors',$7::jsonb) FROM changed c) AS project FROM decision`;
}
export const portfolioStateSql = `WITH ${actorCte},target AS MATERIALIZED(SELECT * FROM projects WHERE id=$3::int FOR UPDATE),
  decision AS(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin')) THEN 'forbidden'
    WHEN NOT EXISTS(SELECT 1 FROM target) THEN 'missing'
    WHEN (SELECT publication_status FROM target)='published' THEN 'readonly'
    WHEN (SELECT updated_at FROM target)!=$5::timestamptz THEN 'conflict' ELSE 'ok' END AS outcome),
  changed AS(UPDATE projects SET publication_status=$4,updated_at=clock_timestamp() WHERE id=$3::int AND (SELECT outcome FROM decision)='ok' RETURNING *),
  audited AS(INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) SELECT $1::uuid,CASE WHEN $4='archived' THEN 'project.archived' ELSE 'project.restored' END,'project',id::text FROM changed)
  SELECT outcome,(SELECT ${readJson("c")} FROM changed c) AS project FROM decision`;
export const portfolioUploadAuditSql = `WITH ${actorCte},target AS MATERIALIZED(SELECT id FROM projects WHERE id=$3::int AND publication_status='draft' FOR SHARE),
  audited AS(INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id,metadata)
    SELECT $1::uuid,'media.uploaded','project',target.id::text,jsonb_build_object('key',$4::text) FROM target WHERE EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin','editor')) RETURNING id)
  SELECT EXISTS(SELECT 1 FROM audited) AS allowed`;
export const databasePortfolioStore: PortfolioStore = {
  async list({ q, state, limit, offset }) {
    const [row] = await query().query(
      `WITH filtered AS(SELECT * FROM projects WHERE ($1='' OR title ILIKE '%' || $1 || '%' OR coalesce(slug,'') ILIKE '%' || $1 || '%') AND ($2='all' OR publication_status=$2)),page AS(SELECT * FROM filtered ORDER BY featured DESC,sort_order,updated_at DESC,id DESC LIMIT $3 OFFSET $4)
      SELECT coalesce((SELECT jsonb_agg(${summaryJson("p")} ORDER BY p.featured DESC,p.sort_order,p.updated_at DESC,p.id DESC) FROM page p),'[]'::jsonb) projects,(SELECT count(*)::int FROM filtered) total`,
      [q, state, limit, offset],
    );
    return {
      projects: row.projects.map((p: unknown) => projectSummarySchema.parse(p)),
      total: row.total,
    };
  },
  async get(id) {
    const [row] = await query().query(
      `SELECT ${readJson("p")} project FROM projects p WHERE id=$1`,
      [id],
    );
    return row ? adminProjectSchema.parse(row.project) : null;
  },
  async save(actor, input, id, expected) {
    const [row] = await query().query(portfolioSaveSql(id === undefined), [
      actor.id,
      actor.authVersion,
      JSON.stringify(payload(input)),
      id ?? null,
      expected ?? null,
      JSON.stringify(input.skillIds),
      JSON.stringify(input.contributors),
    ]);
    outcome(row.outcome);
    return adminProjectSchema.parse(row.project);
  },
  async state(actor, id, state, expected) {
    const [row] = await query().query(portfolioStateSql, [
      actor.id,
      actor.authVersion,
      id,
      state,
      expected,
    ]);
    outcome(row.outcome);
    return adminProjectSchema.parse(row.project);
  },
  async options() {
    const [row] = await query().query(`SELECT
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'slug',slug,'category',category,'iconUrl',icon_url) ORDER BY category,name) FROM skills),'[]'::jsonb) skills,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'publicName',public_name,'clientType',client_type,'status',status) ORDER BY name) FROM clients),'[]'::jsonb) clients,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status) ORDER BY name) FROM contributors),'[]'::jsonb) contributors`);
    return portfolioOptionsSchema.parse(row);
  },
  async quickCreate(actor, kind, input) {
    const cols =
      kind === "clients"
        ? ["name", "client_type", "public_name", "industry", "website_url"]
        : ["name"];
    const values =
      kind === "clients"
        ? [
            input.name,
            input.clientType,
            input.publicName,
            input.industry,
            input.websiteUrl,
          ]
        : [input.name];
    const [row] = await query().query(
      `WITH ${actorCte},created AS(INSERT INTO ${kind} (${cols.join(",")}) SELECT ${values.map((_, i) => `$${i + 3}::text`).join(",")} WHERE EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin','editor')) RETURNING id),
      audited AS(INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) SELECT $1::uuid,'${kind === "clients" ? "client" : "contributor"}.created','${kind === "clients" ? "client" : "contributor"}',id::text FROM created) SELECT id FROM created`,
      [actor.id, actor.authVersion, ...values],
    );
    if (!row) outcome("forbidden");
    return row.id;
  },
  async auditUpload(actor, id, key) {
    const [row] = await query().query(portfolioUploadAuditSql, [
      actor.id,
      actor.authVersion,
      id,
      key,
    ]);
    if (!row.allowed)
      throw new HttpError(
        409,
        "Your access or project status changed. The upload was not attached.",
      );
  },
};
