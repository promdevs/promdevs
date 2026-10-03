import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCw,
} from "lucide-react";
import {
  projectsResponseSchema,
  type AdminSession,
  type Project,
} from "@promdevs/contracts";
import { Button, Wordmark } from "@promdevs/ui";
import { api, ApiError } from "./api";
import { ProjectEditor } from "./ProjectEditor";

const message = (reason: unknown) =>
  reason instanceof Error ? reason.message : "Something went wrong.";

function Brand() {
  return (
    <div className="brand">
      <img src="/logo.png" alt="" width={32} height={32} />
      <Wordmark />
      <span className="brand-tag">studio admin</span>
    </div>
  );
}

function Login({
  onLogin,
  initialError,
}: {
  onLogin: (session: AdminSession) => void;
  initialError: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api<AdminSession>("/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }),
      );
    } catch (reason) {
      setError(message(reason));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <Brand />
      <div className="login-layout">
        <div className="login-intro">
          <p className="eyebrow">Behind the studio</p>
          <h1>
            Good work.
            <br />
            <em>Well managed.</em>
          </h1>
          <p>
            A quiet place to shape the stories
            <br />
            the world sees.
          </p>
          <a href="https://www.promdevs.com" className="text-link">
            Visit PromDevs <ArrowUpRight size={16} aria-hidden />
          </a>
        </div>
        <form className="login-form" onSubmit={submit} aria-busy={busy}>
          <p className="eyebrow">Private workspace</p>
          <h2>Welcome back.</h2>
          <p className="muted">Sign in to manage your portfolio.</p>
          <fieldset disabled={busy}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button type="submit">
              {busy ? "Signing in…" : "Enter the studio"}
              <ArrowUpRight size={18} aria-hidden />
            </Button>
          </fieldset>
          <p className="feedback error" role="alert">
            {error}
          </p>
          <p className="login-footnote">
            Access is restricted to your configured studio administrator.
          </p>
        </form>
      </div>
      <footer className="login-footer">PromDevs / Internal workspace</footer>
    </main>
  );
}

function Dashboard({
  session,
  onLogout,
}: {
  session: AdminSession;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<{ project: Project | null } | null>(
    null,
  );
  const [pending, setPending] = useState<number | "logout" | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void api<{ projects: Project[] }>("/projects", {
      signal: controller.signal,
    })
      .then((body) => {
        if (!controller.signal.aborted) {
          setProjects(projectsResponseSchema.parse(body).projects);
          setError("");
        }
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) onLogout();
        else setError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload, onLogout]);

  async function remove(project: Project) {
    if (
      !window.confirm(
        `Delete “${project.title}”? This removes its public project page and cannot be undone.`,
      )
    )
      return;
    setPending(project.id);
    setError("");
    setNotice("");
    try {
      await api(`/projects/${project.id}`, { method: "DELETE" });
      setProjects((previous) =>
        previous.filter((item) => item.id !== project.id),
      );
      setNotice("Project deleted.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onLogout();
      else setError(message(reason));
    } finally {
      setPending(null);
    }
  }
  async function logout() {
    setPending("logout");
    try {
      await api("/logout", { method: "POST" });
      onLogout();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setPending(null);
    }
  }
  const filtered = projects.filter((project) =>
    `${project.title} ${project.category} ${project.techStack.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );

  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">
        Skip to projects
      </a>
      <aside className="sidebar">
        <Brand />
        <p className="eyebrow sidebar-label">Workspace</p>
        <nav aria-label="Admin navigation">
          <a
            href="#workspace-main"
            className="sidebar-link active"
            aria-current="page"
          >
            <BriefcaseBusiness size={18} aria-hidden />
            Projects
          </a>
          <a
            className="sidebar-link"
            href="https://www.promdevs.com"
            target="_blank"
            rel="noreferrer"
          >
            Public website
            <ArrowUpRight size={17} aria-hidden />
          </a>
        </nav>
        <div className="account">
          <span className="account-avatar" aria-hidden>
            {session.email.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>Studio administrator</strong>
            <span>{session.email}</span>
          </div>
        </div>
        <button
          className="sidebar-link signout"
          onClick={logout}
          disabled={pending !== null}
        >
          <LogOut size={17} aria-hidden />
          {pending === "logout" ? "Signing out…" : "Sign out"}
        </button>
      </aside>
      <main id="workspace-main" className="workspace-main">
        <header className="workspace-top">
          <span className="eyebrow">PromDevs / Portfolio</span>
          <span className="private-label">Private workspace</span>
        </header>
        <section aria-labelledby="projects-title">
          <div className="page-heading">
            <div>
              <p className="eyebrow">The work, in focus</p>
              <h1 id="projects-title">Your portfolio.</h1>
              <p className="muted">
                Real projects. Clear stories. Ready for the world.
              </p>
            </div>
            <Button
              disabled={pending !== null || loading}
              onClick={() => {
                setNotice("");
                setEditor({ project: null });
              }}
            >
              <Plus size={17} aria-hidden />
              Add project
            </Button>
          </div>
          <div className="list-toolbar">
            <label className="search">
              <Search size={18} aria-hidden />
              <span className="sr-only">Search projects</span>
              <input
                type="search"
                placeholder="Find a project…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <span className="project-count">
              {loading
                ? "Loading portfolio…"
                : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
            </span>
            <button
              className="icon-button"
              aria-label="Refresh projects"
              disabled={loading || pending !== null}
              onClick={() => {
                setLoading(true);
                setReload((value) => value + 1);
              }}
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
              Loading your portfolio…
            </div>
          ) : error ? (
            <div className="empty-state">
              <h2>Let’s reconnect.</h2>
              <p>
                Your projects could not be loaded. Check the API and database
                configuration, then refresh.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden>
                <BriefcaseBusiness size={30} />
              </span>
              <h2>
                {query
                  ? "No matching projects."
                  : "Your next story starts here."}
              </h2>
              <p>
                {query
                  ? "Try another title, category, or technology."
                  : "Add your first real project. No samples. No placeholders."}
              </p>
              {!query && (
                <Button
                  className="secondary"
                  onClick={() => setEditor({ project: null })}
                >
                  Add a project
                  <ArrowUpRight size={17} aria-hidden />
                </Button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Category</th>
                    <th scope="col">Year</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <button
                          className="project-title"
                          disabled={pending !== null}
                          onClick={() => setEditor({ project })}
                        >
                          {project.title}
                          <ArrowUpRight size={15} aria-hidden />
                        </button>
                        <span className="project-slug">
                          /{project.slug}
                          {project.featured && (
                            <span className="featured">Featured</span>
                          )}
                        </span>
                      </td>
                      <td>{project.category}</td>
                      <td>{project.year}</td>
                      <td>
                        <span className="status">
                          {project.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            disabled={pending !== null}
                            aria-label={`Edit ${project.title}`}
                            onClick={() => setEditor({ project })}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button danger"
                            disabled={pending !== null}
                            aria-label={`Delete ${project.title}`}
                            onClick={() => remove(project)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="portfolio-note">
            Saved projects appear on the public website. This workspace manages
            portfolio content only.
          </p>
        </section>
        <footer className="workspace-footer">
          <span>PromDevs studio</span>
          <span>Thoughtfully built. Carefully maintained.</span>
        </footer>
      </main>
      {editor && (
        <ProjectEditor
          project={editor.project}
          onClose={() => setEditor(null)}
          onExpired={onLogout}
          onSaved={() => {
            setEditor(null);
            setNotice(
              "Project saved. It is now available on the public website.",
            );
            setLoading(true);
            setReload((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<AdminSession>("/session", { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setSession(value);
      })
      .catch((reason) => {
        if (
          !controller.signal.aborted &&
          !(reason instanceof ApiError && reason.status === 401)
        )
          setError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);
  if (checking)
    return (
      <main className="session-loading" role="status">
        Opening the studio…
      </main>
    );
  return session ? (
    <Dashboard
      session={session}
      onLogout={() => {
        setSession(null);
        setError("");
      }}
    />
  ) : (
    <Login initialError={error} onLogin={setSession} />
  );
}
