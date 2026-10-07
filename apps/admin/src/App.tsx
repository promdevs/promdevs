import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  LogOut,
  UsersRound,
  ShieldCheck,
} from "lucide-react";
import {
  type AdminSession,
  adminIdentitySchema,
  type AdminIdentity,
} from "@promdevs/contracts";
import { Button, Wordmark } from "@promdevs/ui";
import { api, ApiError } from "./api";
import { ProjectWorkspace } from "./ProjectWorkspace";
import { Users } from "./Users";
import { Security } from "./Security";
import { AcceptInvitation } from "./AcceptInvitation";

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
  onLogin: (session: AdminSession) => Promise<void>;
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
      await onLogin(
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
          <p className="muted">Sign in to your studio workspace.</p>
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
            Access is by invitation only. Your role determines what you can
            manage.
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
  session: AdminIdentity;
  onLogout: (notice?: string) => void;
}) {
  const [view, setView] = useState<"projects" | "users" | "security">(
    "projects",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const changeView = (next: typeof view) => {
    if (next === view) return;
    if (
      dirty &&
      !window.confirm("Leave this project and discard unsaved changes?")
    )
      return;
    setDirty(false);
    setView(next);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };
  async function logout() {
    if (dirty && !window.confirm("Sign out and discard unsaved changes?"))
      return;
    setBusy(true);
    try {
      await api("/logout", { method: "POST" });
      onLogout();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <Brand />
        <p className="eyebrow sidebar-label">Workspace</p>
        <nav aria-label="Admin navigation">
          <button
            type="button"
            onClick={() => changeView("projects")}
            className={`sidebar-link ${view === "projects" ? "active" : ""}`}
            aria-current={view === "projects" ? "page" : undefined}
          >
            <BriefcaseBusiness size={18} aria-hidden />
            Projects
          </button>
          {session.role === "owner" && (
            <button
              type="button"
              onClick={() => changeView("users")}
              className={`sidebar-link ${view === "users" ? "active" : ""}`}
              aria-current={view === "users" ? "page" : undefined}
            >
              <UsersRound size={18} aria-hidden />
              Users
            </button>
          )}
          <button
            type="button"
            onClick={() => changeView("security")}
            className={`sidebar-link ${view === "security" ? "active" : ""}`}
            aria-current={view === "security" ? "page" : undefined}
          >
            <ShieldCheck size={18} aria-hidden />
            Security
          </button>
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
            <strong className="role-label">{session.role}</strong>
            <span>{session.email}</span>
          </div>
        </div>
        <button
          className="sidebar-link signout"
          onClick={logout}
          disabled={busy}
        >
          <LogOut size={17} aria-hidden />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </aside>
      <main id="workspace-main" className="workspace-main">
        <header className="workspace-top">
          <span className="eyebrow">
            PromDevs /{" "}
            {view === "users"
              ? "People"
              : view === "security"
                ? "Security"
                : "Portfolio"}
          </span>
          <span className="private-label">Private workspace</span>
        </header>
        <p className="feedback error" role="alert">
          {error}
        </p>
        {view === "users" ? (
          <Users identity={session} onExpired={onLogout} />
        ) : view === "security" ? (
          <Security onExpired={onLogout} />
        ) : (
          <ProjectWorkspace
            identity={session}
            onExpired={onLogout}
            onDirtyChange={setDirty}
          />
        )}
        <footer className="workspace-footer">
          <span>PromDevs studio</span>
          <span>Thoughtfully built. Carefully maintained.</span>
        </footer>
      </main>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<AdminIdentity | null>(null);
  const [invitation, setInvitation] = useState(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "invite",
    );
    return token;
  });
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const signedOut = useCallback((notice = "") => {
    setSession(null);
    setError(notice);
  }, []);
  const signedIn = useCallback(async () => {
    setSession(adminIdentitySchema.parse(await api("/me")));
    setError("");
  }, []);
  useEffect(() => {
    function consumeInvitation() {
      const token = new URLSearchParams(window.location.hash.slice(1)).get(
        "invite",
      );
      if (!token) return;
      setInvitation(token);
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    consumeInvitation();
    window.addEventListener("hashchange", consumeInvitation);
    return () => window.removeEventListener("hashchange", consumeInvitation);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void api("/me", { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted)
          setSession(adminIdentitySchema.parse(value));
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
  if (invitation)
    return (
      <AcceptInvitation
        key={invitation}
        token={invitation}
        onDone={() => {
          setInvitation(null);
          signedOut();
        }}
      />
    );
  if (checking)
    return (
      <main className="session-loading" role="status">
        Opening the studio…
      </main>
    );
  return session ? (
    <Dashboard session={session} onLogout={signedOut} />
  ) : (
    <Login initialError={error} onLogin={signedIn} />
  );
}
