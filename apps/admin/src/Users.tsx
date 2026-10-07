import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Mail,
  Pencil,
  RotateCw,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  adminAccountSchema,
  adminUsersResponseSchema,
  type AdminAccount,
  type AdminIdentity,
} from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The request could not be completed.";
const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Not yet";
type Modal = { kind: "invite" } | { kind: "edit"; user: AdminAccount };

function AccountForm({
  modal,
  onClose,
  onSaved,
  onExpired,
  identity,
}: {
  modal: Modal;
  onClose: () => void;
  onSaved: (notice: string) => void;
  onExpired: () => void;
  identity: AdminIdentity;
}) {
  const user = modal.kind === "edit" ? modal.user : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminAccount["role"]>(
    user?.role ?? "editor",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    element?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      element?.close();
      previousFocus.current?.focus();
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: AdminAccount }>(
        user ? `/users/${user.id}` : "/users/invitations",
        {
          method: user ? "PATCH" : "POST",
          body: JSON.stringify(user ? { name, role } : { name, email, role }),
        },
      );
      adminAccountSchema.parse(result.user);
      if (user?.id === identity.id && role !== user.role) {
        onExpired();
        return;
      }
      onSaved(
        user
          ? "Account updated."
          : "Invitation sent. The private link expires in 72 hours.",
      );
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else setError(message(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor account-dialog"
      aria-labelledby="account-form-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
    >
      <div className="editor-header">
        <div>
          <p className="eyebrow">Studio access</p>
          <h2 id="account-form-title">
            {user ? "Edit account." : "Invite someone."}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close account form"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="editor-note">
        {user
          ? "Access changes end existing sessions. The last active owner cannot be demoted."
          : "They choose their own password. No shared credentials, no public registration."}
      </p>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label>
            Full name
            <input
              required
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {user ? (
            <p className="muted account-email">{user.email}</p>
          ) : (
            <label>
              Email address
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          )}
          <label>
            Role
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AdminAccount["role"])
              }
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <p className="role-explanation">
            {role === "owner"
              ? "Full studio access, including people and permissions. Only give this role to someone you trust to manage access."
              : role === "admin"
                ? "Manage content and media, including published work. No account-management access."
                : "Create and refine drafts. No publishing, editing live work, deleting projects, or managing accounts."}
          </p>
          <p className="feedback error" role="alert">
            {error}
          </p>
          <div className="editor-actions">
            <Button type="button" className="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {busy
                ? user
                  ? "Saving…"
                  : "Sending…"
                : user
                  ? "Save changes"
                  : "Send invitation"}
              <ArrowUpRight size={17} aria-hidden />
            </Button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}

export function Users({
  identity,
  onExpired,
}: {
  identity: AdminIdentity;
  onExpired: () => void;
}) {
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const limit = 20;
  useEffect(() => {
    const controller = new AbortController();
    void api(`/users?limit=${limit}&offset=${offset}`, {
      signal: controller.signal,
    })
      .then((body) => {
        if (!controller.signal.aborted) {
          const parsed = adminUsersResponseSchema.parse(body);
          setUsers(parsed.users);
          setTotal(parsed.total);
          setError("");
        }
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) onExpired();
        else setError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [offset, reload, onExpired]);
  function refresh(background = false) {
    if (!background) setLoading(true);
    setReload((value) => value + 1);
  }
  async function action(
    user: AdminAccount,
    kind: "status" | "sessions" | "invite",
  ) {
    const next = user.status === "disabled" ? "active" : "disabled";
    if (
      kind !== "invite" &&
      !window.confirm(
        kind === "status"
          ? `${next === "disabled" ? "Disable" : "Reactivate"} ${user.name}? All their existing sessions will end.`
          : `Sign ${user.name} out of every session?${user.id === identity.id ? " This includes your current session." : ""}`,
      )
    )
      return;
    setPending(user.id);
    setError("");
    setNotice("");
    try {
      await api(
        `/users/${user.id}${kind === "sessions" ? "/sessions/revoke" : kind === "invite" ? "/invitation" : ""}`,
        {
          method: kind === "status" ? "PATCH" : "POST",
          ...(kind === "status"
            ? { body: JSON.stringify({ status: next }) }
            : {}),
        },
      );
      if (user.id === identity.id && kind !== "invite") {
        onExpired();
        return;
      }
      setNotice(
        kind === "invite"
          ? "New invitation sent; previous links are invalid."
          : kind === "sessions"
            ? "All sessions revoked."
            : "Account access updated.",
      );
      refresh();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else setError(message(reason));
    } finally {
      setPending(null);
    }
  }
  return (
    <section aria-labelledby="users-title" className="users-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">People & permissions</p>
          <h1 id="users-title">Your studio.</h1>
          <p className="muted">The right people. The right access.</p>
        </div>
        <Button
          disabled={!!pending || loading}
          onClick={() => setModal({ kind: "invite" })}
        >
          <Mail size={17} aria-hidden />
          Invite someone
        </Button>
      </div>
      <div className="access-summary">
        <ShieldCheck size={18} aria-hidden />
        <p>
          Owners manage access. Admins manage content. Editors shape drafts.
        </p>
      </div>
      <div className="list-toolbar">
        <span className="project-count">
          {loading
            ? "Loading people…"
            : `${total} ${total === 1 ? "account" : "accounts"}`}
        </span>
        <button
          className="icon-button"
          aria-label="Refresh users"
          disabled={loading || !!pending}
          onClick={() => refresh()}
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
          Loading your studio…
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <h2>{error ? "Let’s reconnect." : "No accounts on this page."}</h2>
          <p>{error || "Refresh or return to the previous page."}</p>
        </div>
      ) : (
        <div className="people-list">
          {users.map((user) => (
            <article key={user.id} className="person-row">
              <div className="person-identity">
                <span className="account-avatar" aria-hidden>
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h2>
                    {user.name}
                    {user.id === identity.id && (
                      <span className="you-label">You</span>
                    )}
                  </h2>
                  <p>{user.email}</p>
                </div>
              </div>
              <div className="person-access">
                <span className="role-label">{user.role}</span>
                <span className={`account-status ${user.status}`}>
                  {user.status === "invited"
                    ? "Invitation pending"
                    : user.status}
                </span>
                <span className="last-login">
                  Last sign-in · {date(user.lastLoginAt)}
                </span>
              </div>
              <div className="person-actions">
                <button
                  className="icon-button"
                  disabled={!!pending}
                  aria-label={`Edit ${user.name}`}
                  onClick={() => setModal({ kind: "edit", user })}
                >
                  <Pencil size={16} />
                </button>
                {user.invitationRequired && (
                  <button
                    className="compact-action"
                    disabled={!!pending}
                    onClick={() => void action(user, "invite")}
                  >
                    {pending === user.id
                      ? "Working…"
                      : user.status === "disabled"
                        ? "Send invitation"
                        : "Resend invite"}
                  </button>
                )}
                <button
                  className="compact-action"
                  disabled={!!pending}
                  onClick={() => void action(user, "sessions")}
                >
                  End sessions
                </button>
                {!(user.status === "disabled" && user.invitationRequired) && (
                  <button
                    className={`compact-action ${user.status !== "disabled" ? "danger" : ""}`}
                    disabled={!!pending}
                    onClick={() => void action(user, "status")}
                  >
                    {user.status === "disabled" ? "Reactivate" : "Disable"}
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
          disabled={offset === 0 || loading || !!pending}
          onClick={() => {
            setLoading(true);
            setOffset(Math.max(0, offset - limit));
          }}
        >
          Previous
        </Button>
        <span>
          {total
            ? `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`
            : "0 accounts"}
        </span>
        <Button
          className="secondary"
          disabled={offset + limit >= total || loading || !!pending}
          onClick={() => {
            setLoading(true);
            setOffset(offset + limit);
          }}
        >
          Next
        </Button>
      </div>
      <p className="portfolio-note">
        No shared passwords. No public registration. Account changes are
        recorded, and the last active owner is protected.
      </p>
      {modal && (
        <AccountForm
          modal={modal}
          identity={identity}
          onExpired={onExpired}
          onClose={() => {
            setModal(null);
            refresh(true);
          }}
          onSaved={(value) => {
            setModal(null);
            setNotice(value);
            refresh(true);
          }}
        />
      )}
    </section>
  );
}
