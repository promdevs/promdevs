import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Check,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { MarkdownField, MarkdownHelp } from "./MarkdownField";
import { slugFromName } from "./catalog-field-helpers";
import { MediaUpload, type MediaFeedback } from "./MediaUpload";
import {
  adminProjectResponseSchema,
  draftProjectInputSchema,
  portfolioOptionsSchema,
  projectUploadSchema,
  productTypes,
  projectPlatforms,
  workStatuses,
  engagementTypes,
  startingPoints,
  serviceChoices,
  aiToolChoices,
  MAX_PROJECT_IMAGE_BYTES,
  MAX_PROJECT_VIDEO_BYTES,
  projectDuration,
  destinationKind,
  type AdminProject,
  type DraftProjectInput,
  type PortfolioOptions,
} from "@promdevs/contracts";
import { Button } from "@promdevs/ui";
import { api, ApiError } from "./api";
const Markdown = lazy(() => import("react-markdown"));
const blank: DraftProjectInput = {
  ...draftProjectInputSchema.parse({ title: "New project" }),
  title: "",
};
const label = (key: string) =>
  (
    ({
      ai_product: "AI Product",
      ai_generated_build: "AI-generated build",
      ai_development: "AI Development",
      qa_performance: "QA & Performance",
      ios: "iOS",
      macos: "macOS",
      base44: "Base44",
      v0: "v0",
    }) as Record<string, string>
  )[key] ||
  key
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const draftOf = (p: AdminProject) =>
  draftProjectInputSchema.parse(
    Object.fromEntries(
      Object.keys(blank).map((key) => [key, p[key as keyof AdminProject]]),
    ),
  );
type TextKey =
  | "title"
  | "slug"
  | "description"
  | "category"
  | "industry"
  | "roleSummary"
  | "problem"
  | "approach"
  | "solution"
  | "results"
  | "coverImage"
  | "coverAlt"
  | "liveUrl"
  | "appStoreUrl"
  | "playStoreUrl"
  | "githubUrl"
  | "seoTitle"
  | "seoDescription"
  | "socialImage";
const sections = [
  ["overview", "Overview"],
  ["scope", "Scope & skills"],
  ["story", "The story"],
  ["media", "Media"],
  ["links", "Links"],
  ["schedule", "Timeline & team"],
  ["search", "Search & placement"],
] as const;
export function ProjectEditor({
  id,
  onClose,
  onCreated,
  onExpired,
  onDirtyChange,
}: {
  id: number | null;
  onClose: () => void;
  onCreated: (id: number) => void;
  onExpired: (notice?: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [project, setProject] = useState<AdminProject | null>(null);
  const [form, setForm] = useState<DraftProjectInput>(blank);
  const [tagsText, setTagsText] = useState("");
  const [saved, setSaved] = useState(JSON.stringify(blank));
  const [options, setOptions] = useState<PortfolioOptions>({
    skills: [],
    clients: [],
    contributors: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [preview, setPreview] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [quick, setQuick] = useState<"clients" | "contributors" | null>(null);
  const [quickName, setQuickName] = useState("");
  const [publicName, setPublicName] = useState("");
  const [quickJobTitle, setQuickJobTitle] = useState("");
  const [clientType, setClientType] = useState("organization");
  const [quickWebsite, setQuickWebsite] = useState("");
  const [quickLinkedin, setQuickLinkedin] = useState("");
  const [teamChoice, setTeamChoice] = useState("");
  const [externalSrc, setExternalSrc] = useState("");
  const [externalType, setExternalType] = useState<"image" | "video">("image");
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [mediaFeedback, setMediaFeedback] = useState<
    Partial<Record<"cover" | "gallery" | "social", MediaFeedback>>
  >({});
  const upload = useRef<XMLHttpRequest | null>(null);
  const alive = useRef(true);
  const dirty = JSON.stringify(form) !== saved;
  const readonly = !!project && project.publicationStatus !== "draft";
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      upload.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      api("/portfolio/options", { signal: controller.signal }),
      id
        ? api(`/portfolio/projects/${id}`, { signal: controller.signal })
        : Promise.resolve(null),
    ])
      .then(([catalog, body]) => {
        if (controller.signal.aborted) return;
        setOptions(portfolioOptionsSchema.parse(catalog));
        const p = body ? adminProjectResponseSchema.parse(body).project : null;
        const data = p ? draftOf(p) : blank;
        setProject(p);
        setForm(data);
        setTagsText(data.tags.join(", "));
        setSaved(JSON.stringify(data));
        setError("");
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) onExpired();
        else
          setError(
            reason instanceof Error ? reason.message : "Project unavailable.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, reload, onExpired]);
  useEffect(() => {
    onDirtyChange(dirty || progress !== null);
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty || progress !== null) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, progress, onDirtyChange]);
  useEffect(() => {
    if (!loading) document.getElementById("project-editor-title")?.focus();
  }, [id, loading]);
  const set = <K extends keyof DraftProjectInput>(
    key: K,
    value: DraftProjectInput[K],
  ) => setForm((v) => ({ ...v, [key]: value }));
  const failed = (reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 401) onExpired();
    else
      setError(
        reason instanceof Error ? reason.message : "The request failed.",
      );
  };
  async function save(event: FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    const parsed = draftProjectInputSchema.safeParse(form);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join(" · "),
      );
      return;
    }
    setBusy(true);
    try {
      const body = await api(
        id ? `/portfolio/projects/${id}` : "/portfolio/projects",
        {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(
            id
              ? { project: parsed.data, expectedUpdatedAt: project!.updatedAt }
              : parsed.data,
          ),
        },
      );
      const next = adminProjectResponseSchema.parse(body).project;
      const nextForm = draftOf(next);
      setProject(next);
      setForm(nextForm);
      setTagsText(nextForm.tags.join(", "));
      setSaved(JSON.stringify(nextForm));
      setMediaFeedback({});
      onDirtyChange(false);
      setNotice("Draft saved. Nothing has been published.");
      if (!id) onCreated(next.id);
    } catch (reason) {
      failed(reason);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function quickCreate() {
    if (!quick) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ id: number }>(`/portfolio/${quick}`, {
        method: "POST",
        body: JSON.stringify(
          quick === "clients"
            ? {
                name: quickName,
                clientType,
                publicName,
                jobTitle: quickJobTitle,
                websiteUrl: quickWebsite,
              }
            : {
                name: quickName,
                websiteUrl: quickWebsite,
                linkedinUrl: quickLinkedin,
              },
        ),
      });
      setOptions(portfolioOptionsSchema.parse(await api("/portfolio/options")));
      if (quick === "clients") set("clientId", result.id);
      else
        set("contributors", [
          ...form.contributors,
          { contributorId: result.id, role: null, notes: null },
        ]);
      setQuick(null);
      setQuickName("");
      setPublicName("");
      setQuickJobTitle("");
      setQuickWebsite("");
      setQuickLinkedin("");
      setNotice(
        "Record created and selected. Save the project to keep the relationship.",
      );
    } catch (reason) {
      failed(reason);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function uploadFile(
    file: File,
    target: "cover" | "gallery" | "social",
  ) {
    if (!id) return;
    const uploadError = (message: string) => {
      setError(message);
      setMediaFeedback((v) => ({
        ...v,
        [target]: { state: "error", message },
      }));
    };
    const types: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
    };
    const contentType =
      file.type || types[file.name.split(".").at(-1)?.toLowerCase() || ""];
    const video = contentType?.startsWith("video/");
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
      ].includes(contentType) ||
      ((target === "cover" || target === "social") && video)
    ) {
      uploadError(
        "Choose a supported image, or an MP4/WebM video for the gallery.",
      );
      return;
    }
    if (!file.size) {
      uploadError("This file is empty. Choose an image or video with content.");
      return;
    }
    if (
      file.size > (video ? MAX_PROJECT_VIDEO_BYTES : MAX_PROJECT_IMAGE_BYTES)
    ) {
      uploadError("Images must be at most 10 MiB; videos at most 50 MiB.");
      return;
    }
    setProgress(0);
    setUploadTarget(target);
    setError("");
    setNotice("");
    setMediaFeedback((v) => ({ ...v, [target]: undefined }));
    try {
      const body = await new Promise<unknown>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        upload.current = xhr;
        xhr.open("POST", `/api/admin/portfolio/projects/${id}/media`);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.timeout = 180000;
        xhr.upload.onprogress = (e) => {
          if (alive.current && e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          let body;
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            reject(
              new Error("Upload service returned an unreadable response."),
            );
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300) resolve(body);
          else reject(new ApiError(xhr.status, body.error || "Upload failed."));
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "Upload interrupted. Check your connection and try again.",
            ),
          );
        xhr.ontimeout = () =>
          reject(new Error("Upload timed out. Try a smaller clip."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(file);
      });
      if (!alive.current) return;
      const result = projectUploadSchema.parse(
        (body as { media: unknown }).media,
      );
      if (target === "cover") set("coverImage", result.src);
      else if (target === "social") set("socialImage", result.src);
      else
        setForm((v) => ({
          ...v,
          gallery: [
            ...v.gallery,
            {
              type: result.type,
              src: result.src,
              width: result.width,
              height: result.height,
              alt: "",
              caption: "",
              poster: null,
            },
          ],
        }));
      setNotice("Upload ready. Save the draft to attach it to the project.");
      const size =
        file.size < 1024 * 1024
          ? `${Math.ceil(file.size / 1024)} KiB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MiB`;
      setMediaFeedback((v) => ({
        ...v,
        [target]: {
          state: "success",
          message: `${file.name} uploaded · ${result.width} × ${result.height} px · ${size}. Save draft to keep it.`,
        },
      }));
    } catch (reason) {
      if (alive.current) {
        failed(reason);
        setMediaFeedback((v) => ({
          ...v,
          [target]: {
            state: "error",
            message:
              reason instanceof Error
                ? reason.message
                : "Upload failed. Try again.",
          },
        }));
      }
    } finally {
      upload.current = null;
      if (alive.current) {
        setProgress(null);
        setUploadTarget(null);
      }
    }
  }
  const text = (
    key: TextKey,
    name: string,
    {
      rows,
      maxLength = 2048,
      type = "text",
      hint,
    }: { rows?: number; maxLength?: number; type?: string; hint?: string } = {},
  ) => (
    <label key={key}>
      {name}
      {rows ? (
        <textarea
          aria-label={name}
          aria-describedby={hint ? `project-${key}-hint` : undefined}
          rows={rows}
          maxLength={maxLength}
          value={form[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <input
          aria-label={name}
          aria-describedby={hint ? `project-${key}-hint` : undefined}
          type={type}
          required={key === "title"}
          maxLength={maxLength}
          value={form[key] ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      )}{" "}
      {hint && <small id={`project-${key}-hint`}>{hint}</small>}
    </label>
  );
  const choices = (
    key: "productTypes" | "platforms" | "services" | "builtWith",
    name: string,
    values: readonly string[],
  ) => (
    <fieldset className="choice-group">
      <legend>{name}</legend>
      <div className="choice-grid">
        {[...new Set([...values, ...form[key]])].map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={(form[key] as string[]).includes(value)}
              onChange={(e) =>
                set(
                  key,
                  (e.target.checked
                    ? [...form[key], value]
                    : form[key].filter((v) => v !== value)) as never,
                )
              }
            />
            {label(value)}
          </label>
        ))}
      </div>
    </fieldset>
  );
  const uploadInput = (target: "cover" | "gallery" | "social") => (
    <MediaUpload
      target={target}
      feedback={mediaFeedback[target]}
      needsSave={!id}
      disabled={
        !id ||
        progress !== null ||
        readonly ||
        busy ||
        (target === "gallery" && form.gallery.length >= 30)
      }
      onFile={(file) => void uploadFile(file, target)}
    />
  );
  function move(index: number, step: number) {
    const gallery = [...form.gallery];
    [gallery[index], gallery[index + step]] = [
      gallery[index + step],
      gallery[index],
    ];
    set("gallery", gallery);
  }
  function addExternal() {
    const parsed = projectUploadSchema.shape.src.safeParse(externalSrc);
    if (!parsed.success) {
      setError("Use a valid HTTP(S) media URL without credentials.");
      return;
    }
    set("gallery", [
      ...form.gallery,
      {
        type: externalType,
        src: parsed.data,
        alt: "",
        caption: "",
        poster: null,
      },
    ]);
    setExternalSrc("");
    setNotice("Media link added. Save to keep it.");
  }
  const duration = projectDuration(form.timeline);
  if (loading)
    return (
      <section role="status" className="empty-state">
        Opening the project workspace…
      </section>
    );
  if (error && !project && id)
    return (
      <section className="empty-state">
        <h1>Project unavailable.</h1>
        <p role="alert">{error}</p>
        <Button onClick={() => setReload((v) => v + 1)}>Try again</Button>
        <Button className="secondary" onClick={onClose}>
          Back to projects
        </Button>
      </section>
    );
  return (
    <section
      className="project-editor-page"
      aria-labelledby="project-editor-title"
    >
      <div className="project-editor-heading">
        <button className="text-link back-button" onClick={onClose}>
          <ArrowLeft size={16} aria-hidden />
          All projects
        </button>
        <span
          className={`account-status ${project?.publicationStatus || "draft"}`}
        >
          {project?.publicationStatus || "New draft"}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A story worth telling</p>
          <h1 id="project-editor-title" tabIndex={-1}>
            {project?.title || "Start with an idea."}
          </h1>
          <p className="muted">
            {readonly
              ? "This record is read-only. Restore archived projects from the list before editing."
              : "Only a title is required. Build out the details at your own pace."}
          </p>
        </div>
      </div>
      <form
        onSubmit={save}
        className="project-editor-form"
        aria-busy={busy || progress !== null}
      >
        <div className="project-savebar">
          <span>
            {readonly
              ? `${label(project!.publicationStatus)} · Read-only`
              : dirty
                ? "Unsaved changes"
                : "All changes saved"}
            {notice && <Check size={15} aria-hidden />}
          </span>
          <div>
            <button
              type="button"
              className="compact-action"
              disabled={busy || progress !== null}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Discard unsaved changes and reload the latest project?",
                  )
                ) {
                  setError("");
                  setReload((v) => v + 1);
                }
              }}
            >
              Reload latest
            </button>
            <Button
              type="submit"
              disabled={busy || readonly || progress !== null}
            >
              <Save size={16} aria-hidden />
              {busy ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </div>
        <p className="feedback error" role="alert">
          {error}
        </p>
        <p className="feedback notice" role="status">
          {notice}
        </p>
        <div className="project-editor-grid">
          <nav className="editor-section-nav" aria-label="Project sections">
            {sections.map(([key, name]) => (
              <button
                type="button"
                key={key}
                onClick={() =>
                  document.getElementById(`project-${key}`)?.scrollIntoView({
                    behavior: matchMedia("(prefers-reduced-motion: reduce)")
                      .matches
                      ? "instant"
                      : "smooth",
                    block: "start",
                  })
                }
              >
                {name}
              </button>
            ))}
          </nav>
          <fieldset
            className="project-fields"
            disabled={busy || readonly || progress !== null}
          >
            <section id="project-overview" className="editor-section">
              <div className="editor-section-heading">
                <h2>The essentials.</h2>
                <p className="muted">
                  Give the product a name and a little context.
                </p>
              </div>
              <div className="field-pair">
                {text("title", "Project title", { maxLength: 160 })}
                <div className="field-with-action">
                  {text("slug", "URL slug", {
                    maxLength: 160,
                    hint: "Optional for a draft. Lowercase words separated by hyphens.",
                  })}
                  <button
                    type="button"
                    className="field-action"
                    disabled={!slugFromName(form.title)}
                    onClick={() => {
                      const slug = slugFromName(form.title);
                      if (
                        !form.slug ||
                        form.slug === slug ||
                        window.confirm(
                          "Replace the existing slug with one generated from the project title?",
                        )
                      )
                        set("slug", slug);
                    }}
                  >
                    Generate from name
                  </button>
                </div>
              </div>
              {text("description", "Project summary", {
                rows: 3,
                maxLength: 2000,
              })}
              <div className="field-pair">
                {text("category", "Category", { maxLength: 100 })}
                <label>
                  Project year
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.year ?? ""}
                    onChange={(e) =>
                      set(
                        "year",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
                <label>
                  Work status
                  <select
                    value={form.status}
                    onChange={(e) =>
                      set(
                        "status",
                        e.target.value as DraftProjectInput["status"],
                      )
                    }
                  >
                    {workStatuses.map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Engagement
                  <select
                    value={form.engagementType ?? ""}
                    onChange={(e) =>
                      set(
                        "engagementType",
                        (e.target.value ||
                          null) as DraftProjectInput["engagementType"],
                      )
                    }
                  >
                    <option value="">Not specified</option>
                    {engagementTypes.map((v) => (
                      <option key={v} value={v}>
                        {label(v)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {choices("productTypes", "Product types", productTypes)}
              {choices("platforms", "Platforms", projectPlatforms)}
              <div className="field-pair">
                {text("industry", "Industry", { maxLength: 160 })}
                <label>
                  Client (optional)
                  <select
                    value={form.clientId ?? ""}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        clientId: e.target.value
                          ? Number(e.target.value)
                          : null,
                        showClient: e.target.value ? v.showClient : false,
                      }))
                    }
                  >
                    <option value="">No client linked</option>
                    {options.clients.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={
                          c.status === "archived" && form.clientId !== c.id
                        }
                      >
                        {c.name}
                        {c.status === "archived" ? " (archived)" : ""}
                      </option>
                    ))}
                  </select>
                  <small>
                    Optional. Choose an existing client, or create one below.
                  </small>
                </label>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={!form.clientId}
                  checked={form.showClient}
                  onChange={(e) => set("showClient", e.target.checked)}
                />
                Show linked client on the future project page
              </label>
              <small className="muted">
                Off by default. This setting does not control review visibility.
              </small>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setQuick("clients");
                  setQuickName("");
                  setQuickWebsite("");
                  setQuickLinkedin("");
                }}
              >
                Create a client
                <Plus size={15} aria-hidden />
              </button>
              {quick === "clients" && (
                <div className="quick-create">
                  <h3>New client</h3>
                  <label>
                    Internal name
                    <input
                      value={quickName}
                      maxLength={160}
                      onChange={(e) => setQuickName(e.target.value)}
                    />
                  </label>
                  <label>
                    Client type
                    <select
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                    >
                      <option value="organization">Organization</option>
                      <option value="individual">Individual</option>
                    </select>
                  </label>
                  <label>
                    Public display name (optional)
                    <input
                      value={publicName}
                      maxLength={160}
                      onChange={(e) => setPublicName(e.target.value)}
                    />
                  </label>
                  <label>
                    Job title (optional)
                    <input
                      value={quickJobTitle}
                      maxLength={160}
                      placeholder="e.g. Founder or Product Lead"
                      onChange={(e) => setQuickJobTitle(e.target.value)}
                    />
                  </label>
                  <label>
                    Website (optional)
                    <input
                      type="url"
                      value={quickWebsite}
                      onChange={(e) => setQuickWebsite(e.target.value)}
                    />
                  </label>
                  <div className="inline-actions">
                    <Button
                      type="button"
                      onClick={() => void quickCreate()}
                      disabled={!quickName.trim()}
                    >
                      Create & select
                    </Button>
                    <Button
                      type="button"
                      className="secondary"
                      onClick={() => setQuick(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </section>
            <section id="project-scope" className="editor-section">
              <div className="editor-section-heading">
                <h2>What went into it.</h2>
                <p className="muted">
                  Separate the product, your contribution, and the tools.
                </p>
              </div>
              {text("roleSummary", "Our contribution", {
                rows: 3,
                maxLength: 2000,
              })}
              <label>
                Starting point
                <select
                  value={form.startingPoint ?? ""}
                  onChange={(e) =>
                    set(
                      "startingPoint",
                      (e.target.value ||
                        null) as DraftProjectInput["startingPoint"],
                    )
                  }
                >
                  <option value="">Choose a starting point (optional)</option>
                  {startingPoints.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
              {choices("services", "Services delivered", serviceChoices)}
              {choices(
                "builtWith",
                "AI platforms & assistants used",
                aiToolChoices,
              )}
              <label>
                Find skills
                <input
                  type="search"
                  value={skillSearch}
                  onChange={(e) => setSkillSearch(e.target.value)}
                  placeholder="Search the imported catalog"
                />
              </label>
              <fieldset className="choice-group">
                <legend>
                  Technology skills · {form.skillIds.length} selected
                </legend>
                <div className="choice-grid">
                  {options.skills
                    .filter((s) =>
                      `${s.name} ${s.category}`
                        .toLowerCase()
                        .includes(skillSearch.toLowerCase()),
                    )
                    .map((s) => (
                      <label key={s.id}>
                        <input
                          type="checkbox"
                          checked={form.skillIds.includes(s.id)}
                          onChange={(e) =>
                            set(
                              "skillIds",
                              e.target.checked
                                ? [...form.skillIds, s.id]
                                : form.skillIds.filter((v) => v !== s.id),
                            )
                          }
                        />
                        <span>
                          {s.name}
                          <small>{s.category}</small>
                        </span>
                      </label>
                    ))}
                </div>
                {!options.skills.length && (
                  <p className="muted">
                    No skills in the catalog. Import skills before selecting
                    technologies.
                  </p>
                )}
              </fieldset>
              {!!project?.techStack.length && !project.skillIds.length && (
                <p className="editor-note">
                  Legacy technologies: {project.techStack.join(", ")}. They
                  remain intact until catalog skills are selected; there is no
                  second editable technology list.
                </p>
              )}
              <label>
                Tags
                <input
                  aria-label="Tags"
                  aria-describedby="project-tags-hint"
                  value={tagsText}
                  onChange={(e) => {
                    setTagsText(e.target.value);
                    set(
                      "tags",
                      e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    );
                  }}
                />
                <small id="project-tags-hint">Separate tags with commas.</small>
              </label>
            </section>
            <section id="project-story" className="editor-section">
              <div className="editor-section-heading">
                <h2>Tell the story.</h2>
                <p className="muted">
                  Basic Markdown: headings, lists, emphasis, quotes, links, and
                  code. Raw HTML is not rendered.
                </p>
              </div>
              <MarkdownHelp />
              <label className="check">
                <input
                  type="checkbox"
                  checked={preview}
                  onChange={(e) => setPreview(e.target.checked)}
                />
                Show Markdown previews
              </label>
              {(["problem", "approach", "solution", "results"] as const).map(
                (key) => (
                  <div key={key}>
                    <MarkdownField
                      name={label(key)}
                      value={form[key] || ""}
                      onChange={(value) => set(key, value)}
                      placeholder={
                        {
                          problem:
                            "What needed to change? Describe the challenge.",
                          approach:
                            "How did you tackle it? Explain the decisions and process.",
                          solution: "What did you build or improve?",
                          results:
                            "What changed? Include only outcomes you can support.",
                        }[key]
                      }
                    />
                    {preview && (
                      <div
                        className="markdown-preview"
                        aria-label={`${label(key)} preview`}
                      >
                        <Suspense fallback={<p>Loading preview...</p>}>
                          <Markdown
                            skipHtml
                            allowedElements={[
                              "p",
                              "strong",
                              "em",
                              "h1",
                              "h2",
                              "h3",
                              "h4",
                              "h5",
                              "h6",
                              "ul",
                              "ol",
                              "li",
                              "blockquote",
                              "pre",
                              "code",
                              "a",
                              "hr",
                              "br",
                            ]}
                            urlTransform={(value) => {
                              try {
                                const u = new URL(value);
                                return ["http:", "https:"].includes(
                                  u.protocol,
                                ) &&
                                  !u.username &&
                                  !u.password
                                  ? value
                                  : "";
                              } catch {
                                return "";
                              }
                            }}
                            components={{
                              a: ({ children, href }) => (
                                <a
                                  href={href || undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {form[key] || "Nothing written yet."}
                          </Markdown>
                        </Suspense>
                      </div>
                    )}
                  </div>
                ),
              )}
            </section>
            <section id="project-media" className="editor-section">
              <div className="editor-section-heading">
                <h2>Show the work.</h2>
                <p className="muted">
                  Images up to 10 MiB. MP4 (H.264) and WebM (VP8/VP9) clips up
                  to 50 MiB. No transcoding.
                </p>
                <p className="editor-note">
                  Uploaded media uses public URLs, even for drafts. Only upload
                  assets you have permission to share publicly, not confidential
                  client files.
                </p>
              </div>
              {!id && (
                <p className="editor-note">
                  Save this draft once to enable uploads. External URLs can be
                  added immediately.
                </p>
              )}
              {uploadInput("cover")}
              {text("coverImage", "Cover image URL", {
                hint: "Or paste an existing hosted image URL instead of uploading.",
              })}
              {text("coverAlt", "Cover image alt text", { maxLength: 300 })}
              {form.coverImage && (
                <img
                  className="editor-cover-preview"
                  src={form.coverImage}
                  alt={form.coverAlt || "Project cover preview"}
                  loading="lazy"
                />
              )}
              <div className="gallery-intro">
                <h3>Gallery · {form.gallery.length}/30</h3>
              </div>
              {uploadInput("gallery")}
              <div className="external-media">
                <label>
                  Media type
                  <select
                    value={externalType}
                    onChange={(e) =>
                      setExternalType(e.target.value as "image" | "video")
                    }
                  >
                    <option value="image">Image URL</option>
                    <option value="video">Video URL</option>
                  </select>
                </label>
                <label>
                  Hosted media URL
                  <input
                    type="url"
                    value={externalSrc}
                    onChange={(e) => setExternalSrc(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="compact-action"
                  disabled={!externalSrc || form.gallery.length >= 30}
                  onClick={addExternal}
                >
                  Add URL
                  <Plus size={15} aria-hidden />
                </button>
              </div>
              <div className="editor-gallery">
                {form.gallery.map((m, index) => (
                  <article className="gallery-item" key={`${index}-${m.src}`}>
                    <div className="gallery-preview">
                      {m.type === "image" ? (
                        <img
                          src={m.src}
                          alt={m.alt || "Gallery preview"}
                          loading="lazy"
                        />
                      ) : /\.(mp4|webm)(?:[?#]|$)/i.test(m.src) ? (
                        <video
                          src={m.src}
                          controls
                          preload="none"
                          poster={m.poster || undefined}
                        />
                      ) : (
                        <a
                          className="text-link"
                          href={m.src}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open hosted video
                          <ArrowUpRight size={16} aria-hidden />
                        </a>
                      )}
                    </div>
                    <div>
                      <p className="eyebrow">{m.type}</p>
                      <label>
                        Source URL
                        <input
                          value={m.src}
                          onChange={(e) =>
                            set(
                              "gallery",
                              form.gallery.map((v, i) =>
                                i === index ? { ...v, src: e.target.value } : v,
                              ),
                            )
                          }
                        />
                      </label>
                      {m.type === "image" ? (
                        <label>
                          Alt text
                          <input
                            maxLength={300}
                            value={m.alt || ""}
                            onChange={(e) =>
                              set(
                                "gallery",
                                form.gallery.map((v, i) =>
                                  i === index
                                    ? { ...v, alt: e.target.value }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                      ) : (
                        <label>
                          Poster image URL
                          <input
                            value={m.poster || ""}
                            onChange={(e) =>
                              set(
                                "gallery",
                                form.gallery.map((v, i) =>
                                  i === index
                                    ? { ...v, poster: e.target.value || null }
                                    : v,
                                ),
                              )
                            }
                          />
                        </label>
                      )}
                      <label>
                        Caption
                        <input
                          maxLength={600}
                          value={m.caption || ""}
                          onChange={(e) =>
                            set(
                              "gallery",
                              form.gallery.map((v, i) =>
                                i === index
                                  ? { ...v, caption: e.target.value }
                                  : v,
                              ),
                            )
                          }
                        />
                      </label>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Move gallery item ${index + 1} earlier`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Move gallery item ${index + 1} later`}
                          disabled={index === form.gallery.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="compact-action danger"
                          onClick={() =>
                            set(
                              "gallery",
                              form.gallery.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={15} aria-hidden />
                          Remove from project
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="role-explanation">
                External links are stored, not fetched by the API. Direct
                MP4/WebM links play here; other video links open at their
                provider. Removing a gallery item unlinks it, without deleting
                the R2 object.
              </p>
            </section>
            <section id="project-links" className="editor-section">
              <div className="editor-section-heading">
                <h2>Where it lives.</h2>
                <p className="muted">
                  Store URLs do not automatically change the product’s selected
                  platforms.
                </p>
              </div>
              {text("liveUrl", "Live URL", {
                type: "url",
                hint: form.liveUrl
                  ? `Recognized as: ${label(destinationKind(form.liveUrl))}`
                  : "A website or app-store URL.",
              })}
              {text("appStoreUrl", "App Store URL", { type: "url" })}
              {text("playStoreUrl", "Google Play URL", { type: "url" })}
              {text("githubUrl", "GitHub / source URL", { type: "url" })}
            </section>
            <section id="project-schedule" className="editor-section">
              <div className="editor-section-heading">
                <h2>Behind the build.</h2>
                <p className="muted">
                  Exact dates, milestones, assignments, and notes are internal.
                </p>
              </div>
              <div className="field-pair">
                <label>
                  Start date
                  <input
                    type="date"
                    value={form.timeline?.start_date || ""}
                    onChange={(e) =>
                      set("timeline", {
                        ...form.timeline,
                        start_date: e.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={form.timeline?.end_date || ""}
                    onChange={(e) =>
                      set("timeline", {
                        ...form.timeline,
                        end_date: e.target.value || null,
                      })
                    }
                  />
                </label>
              </div>
              <p className="editor-note">
                Future public duration:{" "}
                {duration || "Not available until both dates are known."}
              </p>
              {(form.timeline?.milestones || []).map((m, index) => (
                <div className="milestone-row" key={index}>
                  <label>
                    Milestone
                    <input
                      maxLength={160}
                      value={m.label}
                      onChange={(e) =>
                        set("timeline", {
                          ...form.timeline,
                          milestones: form.timeline!.milestones!.map((v, i) =>
                            i === index ? { ...v, label: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Date
                    <input
                      type="date"
                      value={m.date || ""}
                      onChange={(e) =>
                        set("timeline", {
                          ...form.timeline,
                          milestones: form.timeline!.milestones!.map((v, i) =>
                            i === index
                              ? { ...v, date: e.target.value || null }
                              : v,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove milestone ${index + 1}`}
                    onClick={() =>
                      set("timeline", {
                        ...form.timeline,
                        milestones: form.timeline!.milestones!.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-link"
                disabled={(form.timeline?.milestones?.length || 0) >= 30}
                onClick={() =>
                  set("timeline", {
                    ...form.timeline,
                    milestones: [
                      ...(form.timeline?.milestones || []),
                      { label: "", date: null },
                    ],
                  })
                }
              >
                Add milestone
                <Plus size={15} aria-hidden />
              </button>
              <h3 className="team-heading">Contributors</h3>
              <p className="muted">
                People on this project, not administrator accounts.
              </p>
              <div className="inline-actions">
                <label>
                  Add contributor
                  <select
                    value={teamChoice}
                    onChange={(e) => setTeamChoice(e.target.value)}
                  >
                    <option value="">Choose a person</option>
                    {options.contributors
                      .filter(
                        (c) =>
                          c.status === "active" &&
                          !form.contributors.some(
                            (v) => v.contributorId === c.id,
                          ),
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="compact-action"
                  disabled={!teamChoice || form.contributors.length >= 30}
                  onClick={() => {
                    set("contributors", [
                      ...form.contributors,
                      {
                        contributorId: Number(teamChoice),
                        role: null,
                        notes: null,
                      },
                    ]);
                    setTeamChoice("");
                  }}
                >
                  Add
                  <Plus size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setQuick("contributors");
                    setQuickName("");
                    setQuickWebsite("");
                    setQuickLinkedin("");
                  }}
                >
                  Create person
                </button>
              </div>
              {quick === "contributors" && (
                <div className="quick-create">
                  <label>
                    Name
                    <input
                      value={quickName}
                      maxLength={160}
                      onChange={(e) => setQuickName(e.target.value)}
                    />
                  </label>
                  <label>
                    Website / portfolio URL (optional)
                    <input
                      type="url"
                      maxLength={2048}
                      value={quickWebsite}
                      onChange={(e) => setQuickWebsite(e.target.value)}
                    />
                  </label>
                  <label>
                    LinkedIn profile URL (optional)
                    <input
                      type="url"
                      maxLength={2048}
                      value={quickLinkedin}
                      placeholder="https://www.linkedin.com/in/your-name"
                      onChange={(e) => setQuickLinkedin(e.target.value)}
                    />
                  </label>
                  <small className="muted">
                    The website is used first; LinkedIn is the fallback.
                  </small>
                  <div className="inline-actions">
                    <Button
                      type="button"
                      disabled={!quickName.trim()}
                      onClick={() => void quickCreate()}
                    >
                      Create & select
                    </Button>
                    <Button
                      type="button"
                      className="secondary"
                      onClick={() => setQuick(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {form.contributors.map((c, index) => (
                <div className="team-assignment" key={c.contributorId}>
                  <h3>
                    {options.contributors.find((v) => v.id === c.contributorId)
                      ?.name || "Contributor"}
                  </h3>
                  <label>
                    Project role
                    <input
                      maxLength={160}
                      value={c.role || ""}
                      onChange={(e) =>
                        set(
                          "contributors",
                          form.contributors.map((v, i) =>
                            i === index
                              ? { ...v, role: e.target.value || null }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Internal notes
                    <textarea
                      rows={2}
                      maxLength={2000}
                      value={c.notes || ""}
                      onChange={(e) =>
                        set(
                          "contributors",
                          form.contributors.map((v, i) =>
                            i === index
                              ? { ...v, notes: e.target.value || null }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="compact-action danger"
                    onClick={() =>
                      set(
                        "contributors",
                        form.contributors.filter(
                          (v) => v.contributorId !== c.contributorId,
                        ),
                      )
                    }
                  >
                    Remove assignment
                  </button>
                </div>
              ))}
            </section>
            <section id="project-search" className="editor-section">
              <div className="editor-section-heading">
                <h2>Ready for later.</h2>
                <p className="muted">
                  Prepare search metadata and placement without publishing.
                </p>
              </div>
              {text("seoTitle", "SEO title", { maxLength: 160 })}
              {text("seoDescription", "SEO description", {
                rows: 3,
                maxLength: 500,
              })}
              {uploadInput("social")}
              {text("socialImage", "Social image URL", {
                hint: "Or paste a hosted image URL for link previews.",
              })}
              <div className="field-pair">
                <label>
                  Sort order
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={form.sortOrder}
                    onChange={(e) => set("sortOrder", Number(e.target.value))}
                  />
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => set("featured", e.target.checked)}
                  />
                  Feature this project when published
                </label>
              </div>
              <p className="editor-note">
                Publishing is intentionally unavailable in this release. Saving
                a draft never makes it public.
              </p>
            </section>
          </fieldset>
        </div>
      </form>
      {progress !== null && (
        <div className="upload-progress" role="status" aria-live="polite">
          <span>
            {progress === 100
              ? "Inspecting and storing"
              : `Uploading ${uploadTarget}`}{" "}
            · {progress}%
          </span>
          <progress max={100} value={progress} />
          <button
            type="button"
            className="compact-action"
            onClick={() => upload.current?.abort()}
          >
            Cancel upload
          </button>
        </div>
      )}
    </section>
  );
}
