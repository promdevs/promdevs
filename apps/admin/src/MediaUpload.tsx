import { useId, useState } from "react";
import { UploadCloud, Image, Film } from "lucide-react";
import { mediaGuidance } from "./project-field-helpers";

export type MediaFeedback = { state: "success" | "error"; message: string };

export function MediaUpload({
  target,
  disabled,
  needsSave,
  onFile,
  feedback,
}: {
  target: keyof typeof mediaGuidance;
  disabled: boolean;
  needsSave: boolean;
  onFile: (file: File) => void;
  feedback?: MediaFeedback;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const guide = mediaGuidance[target];
  return (
    <div
      className={`media-dropzone ${over && !disabled ? "is-over" : ""} ${disabled ? "is-disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = disabled ? "none" : "copy";
        if (!disabled) setOver(true);
      }}
      onDragLeave={(e) => {
        if (
          !(e.relatedTarget instanceof Node) ||
          !e.currentTarget.contains(e.relatedTarget)
        )
          setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <label className="media-dropzone-target" htmlFor={id}>
        <span className="media-dropzone-icon">
          <UploadCloud size={23} aria-hidden />
        </span>
        <span className="media-dropzone-copy">
          <strong>{guide.title}</strong>
          <span>
            Drag a file here or <b>browse files</b>
          </span>
        </span>
        <input
          id={id}
          type="file"
          className="sr-only"
          aria-label={`Upload ${target} media`}
          aria-describedby={`${id}-guide${feedback ? ` ${id}-feedback` : ""}`}
          accept={guide.accept}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onFile(file);
          }}
        />
      </label>
      <div className="media-dropzone-guidance" id={`${id}-guide`}>
        <span>
          {target === "gallery" ? (
            <Film size={14} aria-hidden />
          ) : (
            <Image size={14} aria-hidden />
          )}
          {guide.recommendation}
        </span>
        <span>{guide.formats}</span>
        {needsSave && <span>Save your draft first to enable uploads.</span>}
        <span>
          Suggested dimensions, not required. Files are not cropped or resized.
        </span>
      </div>
      {feedback && (
        <p
          id={`${id}-feedback`}
          className={`media-dropzone-feedback ${feedback.state}`}
          role={feedback.state === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
