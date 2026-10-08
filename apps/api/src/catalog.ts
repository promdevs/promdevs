import { neon } from "@neondatabase/serverless";
import {
  catalogInputs,
  catalogRecordSchemas,
  catalogSummarySchema,
  reviewOptionsSchema,
  type CatalogInput,
  type CatalogKind,
  type CatalogQuery,
  type CatalogRecord,
  type CatalogSummary,
  type ReviewOptions,
} from "@promdevs/contracts";
import type { AuthIdentity } from "./access-control/auth-store.js";
import { HttpError } from "./errors.js";

export interface CatalogStore {
  list(
    kind: CatalogKind,
    query: CatalogQuery,
  ): Promise<{ records: CatalogSummary[]; total: number }>;
  get(kind: CatalogKind, id: number): Promise<CatalogRecord | null>;
  save(
    actor: AuthIdentity,
    kind: CatalogKind,
    input: CatalogInput,
    id?: number,
    expected?: string,
  ): Promise<CatalogRecord>;
  state(
    actor: AuthIdentity,
    kind: CatalogKind,
    id: number,
    state: string,
    expected: string,
  ): Promise<CatalogRecord>;
  options(
    q: string,
    clientId?: number,
    projectId?: number,
  ): Promise<ReviewOptions>;
}
const config = {
  clients: {
    state: "status",
    name: "name",
    detail: "coalesce(public_name,industry,client_type)",
    references:
      "(SELECT count(*) FROM projects WHERE client_id=p.id)+(SELECT count(*) FROM reviews WHERE client_id=p.id)",
  },
  contributors: {
    state: "status",
    name: "name",
    detail: "coalesce(contact_email,'')",
    references:
      "(SELECT count(*) FROM project_contributors WHERE contributor_id=p.id)",
  },
  skills: {
    state: null,
    name: "name",
    detail: "category || ' / ' || slug",
    references: "(SELECT count(*) FROM project_skills WHERE skill_id=p.id)",
  },
  reviews: {
    state: "publication_status",
    name: "coalesce(nullif(title,''),nullif(author_name,''),'Untitled review')",
    detail: "coalesce(rating::text || ' / 5 · ','') || source",
    references: "CASE WHEN project_id IS NULL THEN 0 ELSE 1 END",
  },
} as const;
const snake = (key: string) =>
  key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const keys = (kind: CatalogKind) => Object.keys(catalogInputs[kind].shape);
function rowJson(kind: CatalogKind, alias: string) {
  const fields = [
    ...keys(kind),
    "id",
    "createdAt",
    "updatedAt",
    ...(config[kind].state
      ? [kind === "reviews" ? "publicationStatus" : "status"]
      : []),
    ...(kind === "reviews" ? ["publishedAt"] : []),
  ];
  return `jsonb_build_object(${fields.map((k) => `'${k}',${alias}.${snake(k)}`).join(",")})`;
}
const actor = `actor AS MATERIALIZED(SELECT id,role FROM admin_users WHERE id=$1::uuid AND auth_version=$2::int AND status='active' FOR SHARE)`;
// Identifiers come only from the fixed internal configuration, never request values.
export function catalogSaveSql(kind: CatalogKind, create: boolean) {
  const fields = keys(kind).map(snake);
  const timestamp = kind === "skills" ? "timestamp" : "timestamptz";
  const relations =
    kind !== "reviews"
      ? "true"
      : `(r.client_id IS NULL OR EXISTS(SELECT 1 FROM clients WHERE id=r.client_id AND (status='active' OR id=(SELECT client_id FROM target)))) AND (r.project_id IS NULL OR EXISTS(SELECT 1 FROM projects WHERE id=r.project_id AND (r.client_id IS NULL OR client_id=r.client_id)))`;
  return `WITH ${actor}, target AS MATERIALIZED(SELECT * FROM ${kind} WHERE id=$4::int FOR UPDATE),input AS(SELECT * FROM jsonb_populate_record(NULL::${kind},$3::jsonb)),
    decision AS(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin','editor') ${!create && kind !== "reviews" ? "AND role IN ('owner','admin')" : ""}) THEN 'forbidden'
    ${
      create
        ? "WHEN $4::int IS NOT NULL OR $5::text IS NOT NULL THEN 'conflict'"
        : `WHEN NOT EXISTS(SELECT 1 FROM target) THEN 'missing'
      WHEN (SELECT updated_at FROM target)!=$5::${timestamp} THEN 'conflict'
      ${kind === "reviews" ? "WHEN (SELECT publication_status FROM target)!='draft' THEN 'readonly'" : ""}
      ${kind === "skills" ? "WHEN (r.name!=(SELECT name FROM target) OR r.slug!=(SELECT slug FROM target)) AND EXISTS(SELECT 1 FROM project_skills WHERE skill_id=$4::int) THEN 'linked'" : ""}`
    }
    WHEN NOT (${relations}) THEN 'relations' ELSE 'ok' END AS outcome FROM input r),
    changed AS(${create ? `INSERT INTO ${kind} (${fields.join(",")}) SELECT ${fields.map((f) => "r." + f).join(",")} FROM input r WHERE (SELECT outcome FROM decision)='ok' RETURNING *` : `UPDATE ${kind} p SET ${fields.map((f) => `${f}=r.${f}`).join(",")},updated_at=clock_timestamp() FROM input r WHERE p.id=$4::int AND (SELECT outcome FROM decision)='ok' RETURNING p.*`}),
    audited AS(INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) SELECT $1::uuid,'${kind}.${create ? "created" : "updated"}','${kind}',id::text FROM changed)
    SELECT outcome,(SELECT ${rowJson(kind, "c")} FROM changed c) record FROM decision`;
}
export function catalogStateSql(kind: Exclude<CatalogKind, "skills">) {
  const state = config[kind].state;
  return `WITH ${actor},target AS MATERIALIZED(SELECT * FROM ${kind} WHERE id=$3::int FOR UPDATE),
    decision AS(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM actor WHERE role IN ('owner','admin')) THEN 'forbidden'
    WHEN NOT EXISTS(SELECT 1 FROM target) THEN 'missing'
    WHEN (SELECT updated_at FROM target)!=$5::timestamptz THEN 'conflict'
    ${kind === "reviews" ? "WHEN (SELECT publication_status FROM target)='published' THEN 'readonly'" : ""} ELSE 'ok' END outcome),
    changed AS(UPDATE ${kind} SET ${state}=$4,updated_at=clock_timestamp() WHERE id=$3::int AND (SELECT outcome FROM decision)='ok' RETURNING *),
    audited AS(INSERT INTO admin_audit_logs(actor_id,action,target_type,target_id) SELECT $1::uuid,'${kind}.state_changed','${kind}',id::text FROM changed)
    SELECT outcome,(SELECT ${rowJson(kind, "c")} FROM changed c) record FROM decision`;
}
function outcome(value: string) {
  const errors: Record<string, [number, string]> = {
    forbidden: [403, "Your account cannot change this record."],
    missing: [404, "Record not found."],
    conflict: [
      409,
      "This record changed since you opened it. Reload before saving; your changes have not been overwritten.",
    ],
    readonly: [
      409,
      "Only draft reviews can be edited. Publishing is not enabled yet.",
    ],
    linked: [
      409,
      "The name and slug of a skill used by projects cannot be changed. Its category and icon can still be edited.",
    ],
    relations: [
      400,
      "Choose an existing client and project. When both are selected, the project must belong to that client. Archived clients cannot be newly linked.",
    ],
  };
  if (value !== "ok") {
    const [status, message] = errors[value] ?? [
      503,
      "Record management is temporarily unavailable.",
    ];
    throw new HttpError(status, message);
  }
}
function query() {
  if (!process.env.DATABASE_URL)
    throw new HttpError(503, "Record storage is not configured.");
  return neon(process.env.DATABASE_URL);
}
async function write(kind: CatalogKind, sql: string, params: unknown[]) {
  try {
    const [row] = await query().query(sql, params);
    outcome(row.outcome);
    return catalogRecordSchemas[kind].parse(row.record);
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "23505"
    )
      throw new HttpError(
        409,
        kind === "skills"
          ? "This skill slug is already in use."
          : "A review with this source and external ID already exists.",
      );
    throw error;
  }
}
export function catalogListSql(kind: CatalogKind) {
  const c = config[kind];
  return `WITH filtered AS(SELECT p.*,${c.name} display_name,${c.detail} detail,${c.state ? "p." + c.state : "'active'::text"} state,(${c.references})::int refs FROM ${kind} p WHERE ($1='' OR (${c.name}) ILIKE '%' || $1 || '%' OR (${c.detail}) ILIKE '%' || $1 || '%') ${c.state ? `AND ($2='all' OR p.${c.state}=$2)` : "AND ($2='all' OR $2='active')"}),page AS(SELECT * FROM filtered ORDER BY updated_at DESC,id DESC LIMIT $3 OFFSET $4) SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',display_name,'detail',detail,'state',state,'updatedAt',updated_at,'references',refs) ORDER BY updated_at DESC,id DESC) FROM page),'[]'::jsonb) records,(SELECT count(*)::int FROM filtered) total`;
}
export const databaseCatalogStore: CatalogStore = {
  async list(kind, { q, state, limit, offset }) {
    const [row] = await query().query(catalogListSql(kind), [
      q,
      state,
      limit,
      offset,
    ]);
    return {
      records: row.records.map((v: unknown) => catalogSummarySchema.parse(v)),
      total: row.total,
    };
  },
  async get(kind, id) {
    const [row] = await query().query(
      `SELECT ${rowJson(kind, "p")} record FROM ${kind} p WHERE id=$1`,
      [id],
    );
    return row ? catalogRecordSchemas[kind].parse(row.record) : null;
  },
  save(actor, kind, input, id, expected) {
    const data = Object.fromEntries(
      Object.entries(input).map(([k, v]) => [snake(k), v]),
    );
    return write(kind, catalogSaveSql(kind, id === undefined), [
      actor.id,
      actor.authVersion,
      JSON.stringify(data),
      id ?? null,
      expected ?? null,
    ]);
  },
  state(actor, kind, id, state, expected) {
    if (kind === "skills")
      throw new HttpError(400, "Skills cannot be archived.");
    return write(kind, catalogStateSql(kind), [
      actor.id,
      actor.authVersion,
      id,
      state,
      expected,
    ]);
  },
  async options(q, clientId, projectId) {
    const [row] = await query().query(
      `SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status) ORDER BY name,id) FROM (SELECT id,name,status FROM clients WHERE id=$2::int OR (status='active' AND ($1='' OR name ILIKE '%' || $1 || '%')) ORDER BY (id=$2::int) DESC NULLS LAST,name,id LIMIT 100) c),'[]'::jsonb) clients,coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'clientId',client_id) ORDER BY title,id) FROM (SELECT id,title,client_id FROM projects WHERE id=$3::int OR ($1='' OR title ILIKE '%' || $1 || '%') ORDER BY (id=$3::int) DESC NULLS LAST,title,id LIMIT 100) p),'[]'::jsonb) projects`,
      [q, clientId ?? null, projectId ?? null],
    );
    return reviewOptionsSchema.parse(row);
  },
};
