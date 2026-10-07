import { useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@promdevs/contracts";
import { Button, Wordmark } from "@promdevs/ui";
import { api } from "./api";

export function AcceptInvitation({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ invitation: { name: string; email: string; role: string } }>(
      "/invitations/preview",
      {
        method: "POST",
        body: JSON.stringify({ token }),
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (!controller.signal.aborted) setPreview(result.invitation);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Invitation unavailable.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password"));
    const confirmation = String(fields.get("confirmation"));
    if (password !== confirmation) {
      setError("The passwords must match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token, password, confirmation }),
      });
      form.reset();
      setComplete(true);
    } catch (reason) {
      form.reset();
      setError(
        reason instanceof Error
          ? reason.message
          : "Invitation could not be accepted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="invitation-page">
      <div className="brand">
        <img src="/logo.png" alt="" width={32} height={32} />
        <Wordmark />
        <span className="brand-tag">studio admin</span>
      </div>
      <section
        className="invitation-content"
        aria-labelledby="invitation-title"
      >
        <p className="eyebrow">By invitation</p>
        <h1 id="invitation-title">
          {complete
            ? "Welcome to the studio."
            : "Good work starts with good people."}
        </h1>
        {loading ? (
          <p className="muted" role="status">
            Checking your invitation…
          </p>
        ) : complete ? (
          <>
            <p className="muted">
              Your account is ready. Sign in with your email and the password
              you just chose.
            </p>
            <Button onClick={onDone}>
              Continue to sign in
              <ArrowUpRight size={17} aria-hidden />
            </Button>
          </>
        ) : preview ? (
          <>
            <p className="muted">
              Hi {preview.name}. You’re joining as an{" "}
              <strong>{preview.role}</strong> with {preview.email}.
            </p>
            <form className="security-form" onSubmit={submit} aria-busy={busy}>
              <fieldset disabled={busy}>
                <label>
                  Choose a password
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={ADMIN_PASSWORD_MIN_LENGTH}
                    maxLength={1024}
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={ADMIN_PASSWORD_MIN_LENGTH}
                    maxLength={1024}
                  />
                </label>
                <p className="role-explanation">
                  At least {ADMIN_PASSWORD_MIN_LENGTH} characters. A unique
                  passphrase works well.
                </p>
                <p className="feedback error" role="alert">
                  {error}
                </p>
                <Button type="submit">
                  {busy ? "Creating your account…" : "Join the studio"}
                  <ArrowUpRight size={17} aria-hidden />
                </Button>
              </fieldset>
            </form>
          </>
        ) : (
          <>
            <p className="feedback error" role="alert">
              {error}
            </p>
            <p className="muted">
              Ask an owner to send a fresh invitation. Links expire after 72
              hours and work only once.
            </p>
            <Button className="secondary" onClick={onDone}>
              Back to sign in
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
