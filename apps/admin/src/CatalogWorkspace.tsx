import { useEffect, useState } from "react";
import { Archive, Pencil, Plus, RotateCw, Search, Undo2 } from "lucide-react";
import { catalogListSchema, type CatalogSummary } from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";
import { catalogTitles } from "./catalog-fields";
import { CatalogEditor } from "./CatalogEditor";
import { ProjectThumbnail } from "./ProjectThumbnail";
import type { CatalogPageProps } from "./catalog-fields";
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Could not complete this request.";
const date = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(
      value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : value + "Z",
    ),
  );
export function CatalogWorkspace(
  props: CatalogPageProps & { selected: string | null },
) {
  const { kind, selected, identity, onExpired, onNavigate } = props;
  const [records, setRecords] = useState<CatalogSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (selected) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/catalog/${kind}?${new URLSearchParams({ q, state, offset: String(offset), limit: String(limit) })}`,
        { signal: controller.signal },
      )
        .then((body) => {
          if (controller.signal.aborted) return;
          const result = catalogListSchema.parse(body);
          setRecords(result.records);
          setTotal(result.total);
          setError("");
          if (result.total && offset >= result.total)
            setOffset(Math.floor((result.total - 1) / limit) * limit);
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
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, q, state, offset, limit, reload, selected, onExpired]);
  async function archive(record: CatalogSummary) {
    const next =
      record.state === "archived"
        ? kind === "reviews"
          ? "draft"
          : "active"
        : "archived";
    if (
      !window.confirm(
        `${next === "archived" ? "Archive" : "Restore"} ${record.name}? Relationships are retained. Reviews are never published by this action.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/catalog/${kind}/${record.id}/state`, {
        method: "POST",
        body: JSON.stringify({
          state: next,
          expectedUpdatedAt: record.updatedAt,
        }),
      });
      setNotice(next === "archived" ? "Record archived." : "Record restored.");
      setReload((v) => v + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onExpired();
      else setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (selected)
    return (
      <CatalogEditor key={kind + selected} {...props} selected={selected} />
    );
  const info = catalogTitles[kind];
  return (
    <section className="catalog-page" aria-labelledby="catalog-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Studio library</p>
          <h1 id="catalog-title">
            {info.title} <span className="catalog-count">{total}</span>
          </h1>
          <p className="muted">{info.description}</p>
        </div>
        <Button onClick={() => onNavigate(`/${kind}/new`)}>
          <Plus size={18} aria-hidden />
          New {info.singular}
        </Button>
      </div>
      <div className="portfolio-toolbar">
        <label className="search">
          <Search size={17} aria-hidden />
          <span className="sr-only">Search {info.title.toLowerCase()}</span>
          <input
            type="search"
            maxLength={160}
            placeholder={`Find a ${info.singular}…`}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
          />
        </label>
        {kind !== "skills" && (
          <label className="filter-label">
            <span className="sr-only">Status filter</span>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setOffset(0);
              }}
            >
              <option value="all">All {info.title.toLowerCase()}</option>
              <option value={kind === "reviews" ? "draft" : "active"}>
                {kind === "reviews" ? "Drafts" : "Active"}
              </option>
              <option value="archived">Archived</option>
              {kind === "reviews" && (
                <option value="published">Previously published</option>
              )}
            </select>
          </label>
        )}
        <button
          className="icon-button"
          aria-label={`Refresh ${kind}`}
          disabled={loading || busy}
          onClick={() => setReload((v) => v + 1)}
        >
          <RotateCw size={17} aria-hidden />
        </button>
      </div>
      <p className="feedback error" role="alert">
        {error}
      </p>
      <p className="feedback notice" role="status">
        {notice}
      </p>
      {loading ? (
        <div className="empty-state" role="status">
          Loading {kind}…
        </div>
      ) : error ? (
        <div className="empty-state">
          <h2>Let’s reconnect.</h2>
          <p>Refresh to try again. Your records have not been replaced.</p>
        </div>
      ) : !records.length ? (
        <div className="empty-state">
          <h2>
            {q || state !== "all" ? "No matching records." : `No ${kind} yet.`}
          </h2>
          <p>
            {q || state !== "all"
              ? "Try a different search or filter."
              : `Add your first ${info.singular} to organize the studio.`}
          </p>
        </div>
      ) : (
        <div>
          <p className="catalog-scroll-hint">
            Scroll horizontally for details and actions.
          </p>
          <div
            className="catalog-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Scrollable records table"
          >
            <table className="catalog-table">
              <caption className="sr-only">
                {info.title} matching search and filters
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    {info.singular[0].toUpperCase() + info.singular.slice(1)}
                  </th>
                  <th scope="col">
                    {kind === "reviews"
                      ? "Source / rating"
                      : kind === "skills"
                        ? "Category / slug"
                        : "Details"}
                  </th>
                  <th scope="col">
                    {kind === "skills" ? "Projects" : "Status"}
                  </th>
                  <th scope="col">Updated</th>
                  <th scope="col" className="actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="catalog-name-layout">
                        {(kind === "clients" || kind === "skills") && (
                          <ProjectThumbnail src={r.imageUrl} contain />
                        )}
                        <div>
                          <a
                            className="catalog-title"
                            href={`/${kind}/${r.id}`}
                            onClick={(e) => {
                              if (
                                !e.ctrlKey &&
                                !e.metaKey &&
                                !e.shiftKey &&
                                !e.altKey
                              ) {
                                e.preventDefault();
                                onNavigate(`/${kind}/${r.id}`);
                              }
                            }}
                          >
                            {r.name}
                          </a>
                          {kind !== "reviews" && (
                            <span className="catalog-summary">
                              {r.references} linked{" "}
                              {kind === "clients" ? "records" : "projects"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="catalog-type">{r.detail || "—"}</td>
                    <td>
                      {kind === "skills" ? (
                        r.references
                      ) : (
                        <span className={"account-status " + r.state}>
                          {r.state}
                        </span>
                      )}
                    </td>
                    <td className="catalog-date">
                      <time dateTime={r.updatedAt}>{date(r.updatedAt)}</time>
                    </td>
                    <td className="catalog-actions">
                      <div>
                        <button
                          className="icon-button"
                          aria-label={`Open ${r.name}`}
                          onClick={() => onNavigate(`/${kind}/${r.id}`)}
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                        {kind !== "skills" &&
                          identity.role !== "editor" &&
                          r.state !== "published" && (
                            <button
                              className="icon-button"
                              disabled={busy}
                              aria-label={`${r.state === "archived" ? "Restore" : "Archive"} ${r.name}`}
                              onClick={() => void archive(r)}
                            >
                              {r.state === "archived" ? (
                                <Undo2 size={16} aria-hidden />
                              ) : (
                                <Archive size={16} aria-hidden />
                              )}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="people-pagination catalog-pagination">
        <label className="page-size">
          Rows per page
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setOffset(0);
            }}
          >
            {[20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button
          className="secondary"
          disabled={!offset || loading || busy}
          onClick={() => setOffset((v) => Math.max(0, v - limit))}
        >
          Previous
        </Button>
        <span>
          {total
            ? `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`
            : "0 records"}
        </span>
        <Button
          className="secondary"
          disabled={offset + limit >= total || loading || busy}
          onClick={() => setOffset((v) => v + limit)}
        >
          Next
        </Button>
      </div>
      <p className="portfolio-note">{info.note}</p>
    </section>
  );
}
