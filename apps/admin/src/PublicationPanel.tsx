import { Check, Globe, Lock } from "lucide-react";

export function PublicationPanel({
  kind,
  status,
  saved,
  dirty,
  busy,
  canPublish,
  missing,
  onChange,
}: {
  kind: "project" | "review";
  status: "draft" | "published" | "archived";
  saved: boolean;
  dirty: boolean;
  busy: boolean;
  canPublish: boolean;
  missing: string[];
  onChange: (state: "draft" | "published") => void;
}) {
  const published = status === "published";
  return (
    <section className="publication-panel" aria-label={`${kind} publication`}>
      <div className="publication-heading">
        <div>
          <p className="eyebrow">Website visibility</p>
          <h2>
            {published ? (
              <Globe size={17} aria-hidden />
            ) : (
              <Lock size={17} aria-hidden />
            )}
            {published
              ? "Published"
              : status === "archived"
                ? "Archived"
                : "Private draft"}
          </h2>
        </div>
        {canPublish && status !== "archived" && (
          <button
            type="button"
            className={published ? "button secondary" : "button"}
            disabled={
              busy || !saved || dirty || (!published && missing.length > 0)
            }
            onClick={() => onChange(published ? "draft" : "published")}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        )}
      </div>
      <p className="muted">
        {published
          ? "Available to the public website. Unpublish to return it to a private, editable draft."
          : status === "archived"
            ? "Restore this record from the list before editing or publishing."
            : !saved
              ? "Save your draft first. Saving alone never makes it public."
              : dirty
                ? "Save your changes before publishing. Only the saved version is published."
                : missing.length
                  ? "Complete the following before publishing:"
                  : "Ready to publish. Review public details and identity settings before continuing."}
      </p>
      {status === "draft" && missing.length > 0 && (
        <ul className="publication-checklist">
          {missing.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      )}
      {status === "draft" && !missing.length && (
        <p className="publication-ready">
          <Check size={14} aria-hidden /> Required content is complete
        </p>
      )}
      {!canPublish && (
        <p className="field-help">
          Only owners and admins can publish or unpublish.
        </p>
      )}
    </section>
  );
}
