import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";

export function Security({
  onExpired,
}: {
  onExpired: (notice?: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const input = {
      currentPassword: String(fields.get("currentPassword")),
      newPassword: String(fields.get("newPassword")),
      confirmation: String(fields.get("confirmation")),
    };
    if (input.newPassword !== input.confirmation) {
      setError("The new passwords must match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/password", { method: "POST", body: JSON.stringify(input) });
      form.reset();
      onExpired(
        "Password changed. Sign in with your new password; other sessions have been signed out.",
      );
    } catch (reason) {
      form.reset();
      if (reason instanceof ApiError && reason.status === 401) onExpired();
      else
        setError(
          reason instanceof Error
            ? reason.message
            : "Password could not be changed.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="security-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Keep your workspace private</p>
          <h1 id="security-title">Account security.</h1>
          <p className="muted">A password only you know.</p>
        </div>
      </div>
      <form className="security-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <label>
            Current password
            <input
              type="password"
              name="currentPassword"
              autoComplete="current-password"
              required
              maxLength={1024}
            />
          </label>
          <label>
            New password
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              required
              minLength={ADMIN_PASSWORD_MIN_LENGTH}
              maxLength={1024}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              name="confirmation"
              autoComplete="new-password"
              required
              minLength={ADMIN_PASSWORD_MIN_LENGTH}
              maxLength={1024}
            />
          </label>
          <p className="role-explanation">
            Use at least {ADMIN_PASSWORD_MIN_LENGTH} characters. Changing your
            password ends all sessions, including this one.
          </p>
          <p className="feedback error" role="alert">
            {error}
          </p>
          <Button type="submit">
            {busy ? "Updating…" : "Update password"}
            <ArrowUpRight size={17} aria-hidden />
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
