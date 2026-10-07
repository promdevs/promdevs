import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Archive,
  Plus,
  RotateCw,
  Search,
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
const route = () =>
  /^#projects\/(new|[1-9]\d*)$/.exec(location.hash)?.[1] ?? null;
export function ProjectWorkspace({
  identity,
  onExpired,
  onDirtyChange,
}: {
  identity: AdminIdentity;
  onExpired: (notice?: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(route);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const dirty = useRef(false);
  const current = useRef(selected);
  const updateDirty = useCallback(
    (value: boolean) => {
      dirty.current = value;
      onDirtyChange(value);
    },
    [onDirtyChange],
  );
  useEffect(() => {
    function changed() {
      const next = route();
      if (next === current.current) return;
      if (
        dirty.current &&
        !window.confirm("Discard unsaved project changes?")
      ) {
        history.replaceState(
          null,
          "",
          current.current
            ? `#projects/${current.current}`
            : location.pathname + location.search,
        );
        return;
      }
      dirty.current = false;
      onDirtyChange(false);
      current.current = next;
      setSelected(next);
    }
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
      onDirtyChange(false);
    };
  }, [onDirtyChange]);
  useEffect(() => {
    if (selected) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      void api(
        `/portfolio/projects?${new URLSearchParams({ q: query, state, offset: String(offset), limit: "20" })}`,
        { signal: controller.signal },
      )
        .then((body) => {
          if (controller.signal.aborted) return;
          const result = portfolioListSchema.parse(body);
          setProjects(result.projects);
          setTotal(result.total);
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
  }, [query, state, offset, reload, onExpired, selected]);
  const navigate = (value: string | null) => {
    location.hash = value ? `projects/${value}` : "projects";
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
        onDirtyChange={updateDirty}
        onClose={() => navigate(null)}
        onCreated={(id) => {
          current.current = String(id);
          history.replaceState(null, "", `#projects/${id}`);
          setSelected(String(id));
        }}
      />
    );
  return (
    <section aria-labelledby="projects-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The work, in progress</p>
          <h1 id="projects-title">Your projects.</h1>
          <p className="muted">
            Start with an idea. Shape the story as you go.
          </p>
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
        <div className="portfolio-list">
          {projects.map((p) => (
            <article className="portfolio-row" key={p.id}>
              <div>
                <span className={`account-status ${p.publicationStatus}`}>
                  {p.publicationStatus}
                </span>
                <button
                  className="project-title"
                  onClick={() => navigate(String(p.id))}
                >
                  {p.title}
                  <ArrowUpRight size={16} aria-hidden />
                </button>
                <p className="muted">
                  {p.description || "The story is still taking shape."}
                </p>
                <div className="project-row-meta">
                  <span>{p.status.replaceAll("_", " ")}</span>
                  {p.year && <span>{p.year}</span>}
                  {p.featured && <span>Featured</span>}
                </div>
              </div>
              <div className="person-actions">
                <Button
                  className="secondary"
                  onClick={() => navigate(String(p.id))}
                >
                  {p.publicationStatus === "draft"
                    ? "Edit draft"
                    : "View project"}
                </Button>
                {identity.role !== "editor" &&
                  p.publicationStatus !== "published" && (
                    <button
                      className="compact-action"
                      disabled={pending !== null}
                      onClick={() => void changeState(p)}
                    >
                      {p.publicationStatus === "archived" ? (
                        <Undo2 size={15} aria-hidden />
                      ) : (
                        <Archive size={15} aria-hidden />
                      )}
                      {p.publicationStatus === "archived"
                        ? "Restore"
                        : "Archive"}
                    </button>
                  )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="people-pagination">
        <Button
          className="secondary"
          disabled={!offset || loading}
          onClick={() => setOffset((v) => Math.max(0, v - 20))}
        >
          Previous
        </Button>
        <span>
          {total
            ? `${offset + 1}–${Math.min(offset + 20, total)} of ${total}`
            : "0 projects"}
        </span>
        <Button
          className="secondary"
          disabled={offset + 20 >= total || loading}
          onClick={() => setOffset((v) => v + 20)}
        >
          Next
        </Button>
      </div>
      <p className="portfolio-note">
        This release prepares projects in private. Publishing will be enabled
        with the new public portfolio. Archiving keeps the record; it does not
        delete R2 files.
      </p>
    </section>
  );
}
