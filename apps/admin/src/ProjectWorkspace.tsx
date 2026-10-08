import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Archive,
  Plus,
  RotateCw,
  Search,
  Pencil,
  Undo2,
} from "lucide-react";
import {
  portfolioListSchema,
  type AdminIdentity,
  type ProjectSummary,
} from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";
import { ProjectEditor } from "./ProjectEditor";
import { ProjectThumbnail } from "./ProjectThumbnail";
export function ProjectWorkspace({
  identity,
  selected,
  onNavigate,
  onExpired,
  onDirtyChange,
}: {
  identity: AdminIdentity;
  selected: string | null;
  onNavigate: (path: string, replace?: boolean) => void;
  onExpired: (notice?: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    if (selected) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/portfolio/projects?${new URLSearchParams({ q: query, state, offset: String(offset), limit: String(pageSize) })}`,
        { signal: controller.signal },
      )
        .then((body) => {
          if (controller.signal.aborted) return;
          const result = portfolioListSchema.parse(body);
          setProjects(result.projects);
          setTotal(result.total);
          if (result.total && offset >= result.total)
            setOffset(Math.floor((result.total - 1) / pageSize) * pageSize);
          setError("");
        })
        .catch((reason) => {
          if (controller.signal.aborted) return;
          if (reason instanceof ApiError && reason.status === 401) onExpired();
          else
            setError(
              reason instanceof Error
                ? reason.message
                : "Projects unavailable.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, state, offset, pageSize, reload, onExpired, selected]);
  const navigate = (value: string | null) => {
    onNavigate(value ? `/projects/${value}` : "/projects");
  };
  async function changeState(project: ProjectSummary) {
    const next =
      project.publicationStatus === "archived" ? "draft" : "archived";
    if (
      !window.confirm(
        `${next === "archived" ? "Archive" : "Restore"} ${project.title}? ${next === "archived" ? "The record and its media are retained." : "It will return as a draft, not be published."}`,
      )
    )
      return;
    setPending(project.id);
    setError("");
    try {
      await api(`/portfolio/projects/${project.id}/state`, {
        method: "POST",
        body: JSON.stringify({
          state: next,
          expectedUpdatedAt: project.updatedAt,
        }),
      });
      setNotice(
        next === "draft" ? "Project restored as a draft." : "Project archived.",
      );
      setReload((v) => v + 1);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not update project.",
        );
    } finally {
      setPending(null);
    }
  }
  if (selected)
    return (
      <ProjectEditor
        key={selected}
        id={selected === "new" ? null : Number(selected)}
        onExpired={onExpired}
        onDirtyChange={onDirtyChange}
        onClose={() => navigate(null)}
        onCreated={(id) => {
          onDirtyChange(false);
          onNavigate(`/projects/${id}`, true);
        }}
      />
    );
  return (
    <section className="catalog-page" aria-labelledby="projects-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1 id="projects-title">
            Projects <span className="catalog-count">{total}</span>
          </h1>
          <p className="muted">Manage projects, drafts, and case studies.</p>
        </div>
        <Button onClick={() => navigate("new")}>
          <Plus size={18} aria-hidden />
          New project
        </Button>
      </div>
      <div className="portfolio-toolbar">
        <label className="search">
          <Search size={17} aria-hidden />
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            maxLength={160}
            placeholder="Find a project…"
            value={query}
            onChange={(e) => {
              setOffset(0);
              setQuery(e.target.value);
            }}
          />
        </label>
        <label className="filter-label">
          <span className="sr-only">Publication filter</span>
          <select
            value={state}
            onChange={(e) => {
              setOffset(0);
              setState(e.target.value);
            }}
          >
            <option value="all">All projects</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
            <option value="published">Previously published</option>
          </select>
        </label>
        <button
          className="icon-button"
          aria-label="Refresh projects"
          disabled={loading}
          onClick={() => setReload((v) => v + 1)}
        >
          <RotateCw size={17} />
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
          Loading your projects…
        </div>
      ) : error ? (
        <div className="empty-state">
          <h2>Let’s reconnect.</h2>
          <p>Refresh to try again. No project data has been replaced.</p>
        </div>
      ) : !projects.length ? (
        <div className="empty-state">
          <h2>
            {query || state !== "all"
              ? "No matching projects."
              : "Your next story starts here."}
          </h2>
          <p>
            {query || state !== "all"
              ? "Try another search or filter."
              : "Only a title is needed to start. No mockups or sample projects."}
          </p>
          <Button className="secondary" onClick={() => navigate("new")}>
            Create a draft
            <ArrowUpRight size={17} aria-hidden />
          </Button>
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
            <table className="catalog-table project-catalog">
              <caption className="sr-only">
                Projects matching your search and filters
              </caption>
              <thead>
                <tr>
                  <th scope="col">Project</th>
                  <th scope="col">Type</th>
                  <th scope="col">Visibility</th>
                  <th scope="col">Updated</th>
                  <th scope="col" className="actions-heading">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="catalog-name">
                      <div className="catalog-name-layout">
                        <ProjectThumbnail src={p.coverImage} />
                        <div>
                          <a
                            className="catalog-title"
                            href={`/projects/${p.id}`}
                            title={p.title}
                            onClick={(event) => {
                              if (
                                !event.ctrlKey &&
                                !event.metaKey &&
                                !event.shiftKey &&
                                !event.altKey
                              ) {
                                event.preventDefault();
                                navigate(String(p.id));
                              }
                            }}
                          >
                            {p.title}
                            {p.featured && (
                              <span
                                className="featured-dot"
                                title="Featured"
                                aria-label="Featured"
                              />
                            )}
                          </a>
                          <span className="catalog-summary">
                            {p.description || p.status.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="catalog-type">
                      {p.productTypes
                        .map(
                          (v) =>
                            ({
                              web_app: "Web app",
                              mobile_app: "Mobile app",
                              ai_product: "AI product",
                              website: "Website",
                            })[v],
                        )
                        .join(", ") || "Not set"}
                    </td>
                    <td className="catalog-state">
                      <span className={"account-status " + p.publicationStatus}>
                        {p.publicationStatus}
                      </span>
                    </td>
                    <td className="catalog-date">
                      <time dateTime={p.updatedAt}>
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(p.updatedAt))}
                      </time>
                    </td>
                    <td className="catalog-actions">
                      <div>
                        <button
                          className="icon-button"
                          title={
                            p.publicationStatus === "draft"
                              ? "Edit project"
                              : "View project"
                          }
                          aria-label={
                            (p.publicationStatus === "draft"
                              ? "Edit "
                              : "View ") + p.title
                          }
                          onClick={() => navigate(String(p.id))}
                        >
                          <Pencil size={16} aria-hidden />
                        </button>
                        {identity.role !== "editor" &&
                          p.publicationStatus !== "published" && (
                            <button
                              className="icon-button"
                              disabled={pending !== null}
                              title={
                                p.publicationStatus === "archived"
                                  ? "Restore"
                                  : "Archive"
                              }
                              aria-label={
                                (p.publicationStatus === "archived"
                                  ? "Restore "
                                  : "Archive ") + p.title
                              }
                              onClick={() => void changeState(p)}
                            >
                              {p.publicationStatus === "archived" ? (
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
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
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
          disabled={!offset || loading}
          onClick={() => setOffset((v) => Math.max(0, v - pageSize))}
        >
          Previous
        </Button>
        <span>
          {total
            ? `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total}`
            : "0 projects"}
        </span>
        <Button
          className="secondary"
          disabled={offset + pageSize >= total || loading}
          onClick={() => setOffset((v) => v + pageSize)}
        >
          Next
        </Button>
      </div>
      <p className="portfolio-note">
        Drafts are private. Archiving retains records and media. Publishing is
        not enabled yet.
      </p>
    </section>
  );
}
