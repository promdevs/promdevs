import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, X } from "lucide-react";
import {
  projectInputSchema,
  projectResponseSchema,
  type Project,
  type ProjectInput,
} from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";

type Props = {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
  onExpired: () => void;
};

export function ProjectEditor({ project, onClose, onSaved, onExpired }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    category: project?.category ?? "",
    description: project?.description ?? "",
    techStack: project?.techStack.join(", ") ?? "",
    year: project?.year ?? new Date().getFullYear(),
    status: project?.status ?? "completed",
    coverImage: project?.coverImage ?? "",
    liveUrl: project?.liveUrl ?? "",
    githubUrl: project?.githubUrl ?? "",
    featured: project?.featured ?? false,
    problem: project?.problem ?? "",
    solution: project?.solution ?? "",
    results: project?.results ?? "",
    tags: project?.tags.join(", ") ?? "",
  });
  useEffect(() => {
    if (!previousFocus.current && document.activeElement instanceof HTMLElement)
      previousFocus.current = document.activeElement;
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, []);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const split = (text: string) => [
      ...new Set(
        text
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    const input = projectInputSchema.safeParse({
      ...form,
      year: Number(form.year),
      techStack: split(form.techStack),
      tags: split(form.tags),
    });
    if (!input.success) {
      setError(input.error.issues[0]?.message || "Check the project fields.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api<{ project: Project }>(
        project ? `/projects/${project.id}` : "/projects",
        {
          method: project ? "PUT" : "POST",
          body: JSON.stringify(input.data satisfies ProjectInput),
        },
      );
      projectResponseSchema.parse(result);
      onSaved();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) {
        onExpired();
        return;
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save the project.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="editor"
      aria-labelledby="editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="editor-header">
        <div>
          <p className="eyebrow">Portfolio / {project ? "Edit" : "Create"}</p>
          <h2 id="editor-title">
            {project ? "Refine the story." : "Make it public."}
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close project editor"
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="editor-note">
        Saved projects are visible on the public website. There is no draft or
        publishing workflow yet.
      </p>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          <div className="field-pair">
            <label>
              Project title
              <input
                autoFocus
                required
                maxLength={160}
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
              />
            </label>
            <label>
              URL slug
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={160}
                placeholder="your-project-name"
                value={form.slug}
                onChange={(event) => set("slug", event.target.value)}
              />
              <small>/projects/{form.slug || "your-project-name"}</small>
            </label>
            <label>
              Category
              <input
                required
                maxLength={100}
                placeholder="Web application"
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
              />
            </label>
            <label>
              Project year
              <input
                type="number"
                required
                min={2000}
                max={2100}
                value={form.year}
                onChange={(event) => set("year", Number(event.target.value))}
              />
            </label>
          </div>
          <label>
            Short description
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </label>
          <div className="field-pair">
            <label>
              Technology stack
              <input
                required
                placeholder="Next.js, TypeScript, PostgreSQL"
                value={form.techStack}
                onChange={(event) => set("techStack", event.target.value)}
              />
              <small>Separate technologies with commas.</small>
            </label>
            <label>
              Status
              <input
                required
                maxLength={80}
                placeholder="completed"
                value={form.status}
                onChange={(event) => set("status", event.target.value)}
              />
              <small>Status is descriptive; it does not hide a project.</small>
            </label>
          </div>
          <label>
            Cover image URL
            <input
              maxLength={2048}
              placeholder="https://… or /images/…"
              value={form.coverImage}
              onChange={(event) => set("coverImage", event.target.value)}
            />
            <small>
              Use a hosted image or an existing website asset. Uploads are not
              implemented.
            </small>
          </label>
          <div className="field-pair">
            <label>
              Live website
              <input
                type="url"
                maxLength={2048}
                value={form.liveUrl}
                onChange={(event) => set("liveUrl", event.target.value)}
              />
            </label>
            <label>
              GitHub repository
              <input
                type="url"
                maxLength={2048}
                value={form.githubUrl}
                onChange={(event) => set("githubUrl", event.target.value)}
              />
            </label>
          </div>
          <h3 className="form-section-title">The story behind the work</h3>
          <label>
            The challenge
            <textarea
              rows={4}
              maxLength={12000}
              value={form.problem}
              onChange={(event) => set("problem", event.target.value)}
            />
          </label>
          <label>
            Our approach
            <textarea
              rows={4}
              maxLength={12000}
              value={form.solution}
              onChange={(event) => set("solution", event.target.value)}
            />
          </label>
          <label>
            The outcome
            <textarea
              rows={4}
              maxLength={12000}
              value={form.results}
              onChange={(event) => set("results", event.target.value)}
            />
          </label>
          <label>
            Tags
            <input
              placeholder="SaaS, product design"
              value={form.tags}
              onChange={(event) => set("tags", event.target.value)}
            />
            <small>Separate tags with commas.</small>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => set("featured", event.target.checked)}
            />
            Mark as featured
          </label>
        </fieldset>
        <p className="feedback error" role="alert">
          {error}
        </p>
        <div className="editor-actions">
          <Button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save project"}
            <ArrowUpRight size={17} aria-hidden />
          </Button>
        </div>
      </form>
    </dialog>
  );
}
