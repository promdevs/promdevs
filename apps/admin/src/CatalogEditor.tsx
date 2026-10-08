import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import {
  catalogInputs,
  contributorProfileUrl,
  catalogRecordSchemas,
  reviewOptionsSchema,
  type CatalogRecord,
  type ReviewOptions,
} from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";
import {
  catalogFields,
  catalogTitles,
  initialCatalogForm,
  type CatalogForm,
} from "./catalog-fields";
import type { CatalogPageProps } from "./catalog-fields";
import { CatalogImageUpload } from "./CatalogImageUpload";
import { clientReviewIdentity, slugFromName } from "./catalog-field-helpers";
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Could not complete this request.";
export function CatalogEditor({
  kind,
  selected,
  identity,
  onExpired,
  onDirtyChange,
  onNavigate,
}: CatalogPageProps & { selected: string }) {
  const id = selected === "new" ? null : Number(selected);
  const [form, setForm] = useState<CatalogForm>(() => initialCatalogForm(kind));
  const [record, setRecord] = useState<CatalogRecord | null>(null);
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(initialCatalogForm(kind)),
  );
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [lookup, setLookup] = useState("");
  const [options, setOptions] = useState<ReviewOptions>({
    clients: [],
    projects: [],
  });
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(kind === "reviews");
  const [uploading, setUploading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const autofillRequest = useRef<AbortController | null>(null);
  useEffect(() => () => autofillRequest.current?.abort(), []);
  const working = busy || uploading || autofilling;
  const dirty = JSON.stringify(form) !== baseline;
  const profileUrl =
    kind === "contributors"
      ? contributorProfileUrl({
          websiteUrl: String(form.websiteUrl || ""),
          linkedinUrl: String(form.linkedinUrl || ""),
        })
      : null;
  const readonly =
    !!id &&
    (kind === "reviews"
      ? record &&
        "publicationStatus" in record &&
        record.publicationStatus !== "draft"
      : identity.role === "editor");
  useEffect(() => {
    onDirtyChange(dirty || uploading);
    return () => onDirtyChange(false);
  }, [dirty, uploading, onDirtyChange]);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<{ record: unknown }>(`/catalog/${kind}/${id}`, {
      signal: controller.signal,
    })
      .then((body) => {
        if (controller.signal.aborted) return;
        const value = catalogRecordSchemas[kind].parse(body.record);
        const next = Object.fromEntries(
          Object.keys(initialCatalogForm(kind)).map((key) => [
            key,
            (value as unknown as CatalogForm)[key] ??
              initialCatalogForm(kind)[key],
          ]),
        );
        setRecord(value);
        setForm(next);
        setBaseline(JSON.stringify(next));
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          if (e instanceof ApiError && e.status === 401) onExpired();
          else setError(message(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, kind, reload, onExpired]);
  useEffect(() => {
    if (kind !== "reviews") return;
    const controller = new AbortController();
    setLookupLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: lookup });
      if (form.clientId) params.set("clientId", String(form.clientId));
      if (form.projectId) params.set("projectId", String(form.projectId));
      void api(`/catalog/options?${params}`, { signal: controller.signal })
        .then((body) => {
          if (!controller.signal.aborted) {
            setOptions(reviewOptionsSchema.parse(body));
            setLookupError("");
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            if (e instanceof ApiError && e.status === 401) onExpired();
            else setLookupError(message(e));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLookupLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, lookup, form.clientId, form.projectId, onExpired]);
  function change(key: string, value: CatalogForm[string]) {
    setForm((v) => ({ ...v, [key]: value }));
    setNotice("");
  }
  function useInternalName() {
    const name = String(form.name || "").trim();
    if (!name || working || readonly) return;
    if (
      form.contactName &&
      form.contactName !== name &&
      !window.confirm(
        "Replace the contact person's name with the internal client name?",
      )
    )
      return;
    change("contactName", name);
    setNotice(
      "Internal client name copied. Email and phone have not been changed.",
    );
  }
  function generateSlug() {
    const slug = slugFromName(String(form.name || ""));
    if (!slug || working || readonly) return;
    if (
      form.slug &&
      form.slug !== slug &&
      !window.confirm(
        "Replace the existing slug with one generated from the name?",
      )
    )
      return;
    change("slug", slug);
  }
  async function useClientIdentity() {
    if (!form.clientId || working || readonly) return;
    if (
      ["authorName", "authorRole", "authorCompany", "authorAvatar"].some(
        (key) => !!form[key],
      ) &&
      !window.confirm(
        "Replace the current review author details with the selected client's information?",
      )
    )
      return;
    const clientId = form.clientId;
    const controller = new AbortController();
    autofillRequest.current = controller;
    setAutofilling(true);
    setError("");
    try {
      const result = await api<{ record: unknown }>(
        `/catalog/clients/${clientId}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const client = catalogRecordSchemas.clients.parse(result.record);
      setForm((value) =>
        value.clientId === clientId
          ? { ...value, ...clientReviewIdentity(client) }
          : value,
      );
      setNotice(
        "Client identity copied. Show identity and review visibility are unchanged. Check the name and image before saving.",
      );
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      else setError(message(error));
    } finally {
      if (!controller.signal.aborted) setAutofilling(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (working || readonly) return;
    setError("");
    setNotice("");
    const parsed = catalogInputs[kind].safeParse(form);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((v) => `${v.path.join(".")}: ${v.message}`)
          .join(" · "),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ record: unknown }>(
        `/catalog/${kind}${id ? "/" + id : ""}`,
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(
            id
              ? { record: parsed.data, expectedUpdatedAt: record?.updatedAt }
              : parsed.data,
          ),
        },
      );
      const value = catalogRecordSchemas[kind].parse(result.record);
      const next = Object.fromEntries(
        Object.keys(initialCatalogForm(kind)).map((key) => [
          key,
          (value as unknown as CatalogForm)[key] ??
            initialCatalogForm(kind)[key],
        ]),
      );
      setRecord(value);
      setForm(next);
      setBaseline(JSON.stringify(next));
      onDirtyChange(false);
      setNotice(
        kind === "reviews"
          ? "Review saved privately as a draft."
          : "Record saved.",
      );
      if (!id) onNavigate(`/${kind}/${value.id}`, true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const info = catalogTitles[kind];
  return (
    <section
      className="catalog-editor"
      aria-labelledby="record-title"
      aria-busy={loading || working}
    >
      <button
        className="text-link"
        disabled={working}
        onClick={() => onNavigate(`/${kind}`)}
      >
        <ArrowLeft size={16} aria-hidden />
        Back to {info.title.toLowerCase()}
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{info.title}</p>
          <h1 id="record-title">
            {id ? (readonly ? "View" : "Edit") : "New"} {info.singular}
          </h1>
          <p className="muted">{info.note}</p>
        </div>
        {record && (
          <span className="account-status">
            {"publicationStatus" in record
              ? record.publicationStatus
              : "status" in record
                ? record.status
                : "Skill"}
          </span>
        )}
      </div>
      <p className="feedback error" role="alert">
        {error}
      </p>
      <p className="feedback notice" role="status">
        {notice}
      </p>
      {loading ? (
        <div className="empty-state" role="status">
          Loading record…
        </div>
      ) : id && !record ? (
        <Button onClick={() => setReload((v) => v + 1)}>Retry loading</Button>
      ) : (
        <form onSubmit={save}>
          {readonly && (
            <p className="portfolio-note">
              {kind === "reviews"
                ? "Archived and published reviews are read-only. Restore an archived review from the list to edit it."
                : "Editors can create and view shared records. An owner or admin can update them."}
            </p>
          )}
          <fieldset disabled={working || !!readonly}>
            {kind === "reviews" && (
              <section className="catalog-form-group">
                <h2>Relationships</h2>
                <p className="muted">
                  Optional in a draft. If both are selected, the project must
                  belong to the client.
                </p>
                <label>
                  Find a client or project
                  <input
                    type="search"
                    value={lookup}
                    maxLength={160}
                    placeholder="Search names to narrow the choices…"
                    onChange={(e) => setLookup(e.target.value)}
                  />
                </label>
                <p className="field-help" role="status">
                  {lookupLoading
                    ? "Finding records…"
                    : "Up to 100 matches per list. Search for more; saved selections are retained."}
                </p>
                <p className="feedback error" role="alert">
                  {lookupError}
                </p>
                <div className="catalog-form-grid">
                  <label>
                    Client
                    <select
                      value={form.clientId ? String(form.clientId) : ""}
                      disabled={lookupLoading || !!lookupError}
                      onChange={(e) => {
                        const clientId = e.target.value
                          ? Number(e.target.value)
                          : null;
                        setForm((v) => ({ ...v, clientId, projectId: null }));
                      }}
                    >
                      <option value="">No client yet</option>
                      {options.clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.status === "archived" ? " (archived)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Project
                    <select
                      value={form.projectId ? String(form.projectId) : ""}
                      disabled={lookupLoading || !!lookupError}
                      onChange={(e) => {
                        const projectId = e.target.value
                          ? Number(e.target.value)
                          : null;
                        const project = options.projects.find(
                          (p) => p.id === projectId,
                        );
                        setForm((v) => ({
                          ...v,
                          projectId,
                          clientId: project ? project.clientId : v.clientId,
                        }));
                      }}
                    >
                      <option value="">No project</option>
                      {options.projects
                        .filter(
                          (p) => !form.clientId || p.clientId === form.clientId,
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
              </section>
            )}
            {[...new Set(catalogFields[kind].map((f) => f.group))].map(
              (group) => (
                <section className="catalog-form-group" key={group}>
                  <h2>{group}</h2>
                  {kind === "clients" && group === "Private contact" && (
                    <div className="catalog-autofill">
                      <button
                        type="button"
                        className="field-action"
                        disabled={!String(form.name || "").trim()}
                        onClick={useInternalName}
                      >
                        Use internal name
                      </button>
                      <small className="field-help">
                        Copies the internal client name into Contact person.
                        Email and phone stay unchanged.
                      </small>
                    </div>
                  )}
                  {kind === "reviews" && group === "Identity" && (
                    <div className="catalog-autofill">
                      <button
                        type="button"
                        className="field-action"
                        disabled={!form.clientId}
                        onClick={() => void useClientIdentity()}
                      >
                        Fill from client
                      </button>
                      <small className="field-help">
                        Select a client above. Copies their name, role,
                        organization and image, using contact/internal names if
                        needed. Check these before showing identity; this action
                        does not enable it.
                      </small>
                    </div>
                  )}
                  <div className="catalog-form-grid">
                    {catalogFields[kind]
                      .filter((f) => f.group === group)
                      .map((f) => {
                        const helpId = `${kind}-${f.key}-help`;
                        return (
                          <div
                            key={f.key}
                            className={
                              f.type === "textarea"
                                ? "full-width"
                                : f.type === "checkbox"
                                  ? "full-width"
                                  : ""
                            }
                          >
                            <label
                              className={
                                f.type === "checkbox" ? "check" : undefined
                              }
                            >
                              {f.type === "checkbox" ? (
                                <>
                                  <input
                                    aria-label={f.label}
                                    type="checkbox"
                                    checked={!!form[f.key]}
                                    onChange={(e) =>
                                      change(f.key, e.target.checked)
                                    }
                                    aria-describedby={
                                      f.help ? helpId : undefined
                                    }
                                  />
                                  <span>
                                    {f.label}
                                    {f.help && (
                                      <small id={helpId} className="field-help">
                                        {f.help}
                                      </small>
                                    )}
                                  </span>
                                </>
                              ) : (
                                <>
                                  {f.label}
                                  {f.required && " *"}
                                  {f.type === "textarea" ? (
                                    <textarea
                                      aria-label={f.label}
                                      value={String(form[f.key] ?? "")}
                                      rows={f.key === "body" ? 6 : 4}
                                      maxLength={f.max}
                                      onChange={(e) =>
                                        change(f.key, e.target.value)
                                      }
                                      aria-describedby={
                                        f.help ? helpId : undefined
                                      }
                                    />
                                  ) : f.type === "select" ? (
                                    <select
                                      aria-label={f.label}
                                      value={String(form[f.key] ?? "")}
                                      onChange={(e) =>
                                        change(f.key, e.target.value)
                                      }
                                    >
                                      {f.options?.map((v) => (
                                        <option key={v} value={v}>
                                          {v}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      aria-label={f.label}
                                      type={f.type || "text"}
                                      required={f.required}
                                      maxLength={
                                        f.type === "url"
                                          ? 2048
                                          : ["externalId", "title"].includes(
                                                f.key,
                                              )
                                            ? 200
                                            : f.key === "contactEmail"
                                              ? 320
                                              : [
                                                    "source",
                                                    "contactPhone",
                                                  ].includes(f.key)
                                                ? 80
                                                : 160
                                      }
                                      min={
                                        f.key === "rating"
                                          ? 1
                                          : f.key === "sortOrder"
                                            ? 0
                                            : undefined
                                      }
                                      max={
                                        f.key === "rating"
                                          ? 5
                                          : f.key === "sortOrder"
                                            ? 1000000
                                            : undefined
                                      }
                                      step={f.key === "rating" ? 0.01 : 1}
                                      value={
                                        f.type === "date"
                                          ? String(form[f.key] ?? "").slice(
                                              0,
                                              10,
                                            )
                                          : String(form[f.key] ?? "")
                                      }
                                      onChange={(e) =>
                                        change(
                                          f.key,
                                          f.type === "number"
                                            ? e.target.value === ""
                                              ? null
                                              : Number(e.target.value)
                                            : f.type === "date"
                                              ? e.target.value
                                                ? new Date(
                                                    e.target.value +
                                                      "T00:00:00Z",
                                                  ).toISOString()
                                                : null
                                              : e.target.value,
                                        )
                                      }
                                      aria-describedby={
                                        f.help ? helpId : undefined
                                      }
                                    />
                                  )}
                                  {f.help && (
                                    <small className="field-help" id={helpId}>
                                      {f.help}
                                    </small>
                                  )}
                                </>
                              )}
                            </label>
                            {f.key === "slug" && (
                              <button
                                type="button"
                                className="field-action"
                                disabled={
                                  !slugFromName(String(form.name || ""))
                                }
                                onClick={generateSlug}
                              >
                                Generate from name
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </section>
              ),
            )}
          </fieldset>
          {(kind === "clients" || kind === "skills") && (
            <CatalogImageUpload
              kind={kind}
              src={
                String(form[kind === "clients" ? "logo" : "iconUrl"] || "") ||
                null
              }
              disabled={busy || autofilling || !!readonly}
              onChange={(url) =>
                change(kind === "clients" ? "logo" : "iconUrl", url)
              }
              onBusyChange={setUploading}
              onExpired={onExpired}
            />
          )}
          <div className="catalog-save">
            {profileUrl && (
              <a
                className="text-link"
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open profile ↗
              </a>
            )}
            <span className="muted">
              {dirty ? "Unsaved changes" : record ? "Saved" : "Not saved yet"}
            </span>
            {!readonly && (
              <Button type="submit" disabled={working}>
                {busy
                  ? "Saving…"
                  : kind === "reviews"
                    ? "Save draft"
                    : "Save " + info.singular}
              </Button>
            )}
            <Button
              type="button"
              className="secondary"
              disabled={working}
              onClick={() => onNavigate(`/${kind}`)}
            >
              Close
            </Button>
            {record && (
              <Button
                type="button"
                className="secondary"
                disabled={working}
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm("Discard changes and reload this record?")
                  )
                    setReload((v) => v + 1);
                }}
              >
                Reload saved version
              </Button>
            )}
          </div>
          <p className="feedback error" role="alert">
            {error}
          </p>
        </form>
      )}
    </section>
  );
}
