import { useEffect, useRef, useState } from "react";
import {
  MAX_PROJECT_IMAGE_BYTES,
  projectUploadSchema,
} from "@promdevs/contracts";
import { MediaUpload, type MediaFeedback } from "./MediaUpload";
import { ProjectThumbnail } from "./ProjectThumbnail";
import { ApiError } from "./api";

export function CatalogImageUpload({
  kind,
  src,
  disabled,
  onChange,
  onBusyChange,
  onExpired,
}: {
  kind: "clients" | "skills";
  src: string | null;
  disabled: boolean;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
  onExpired: () => void;
}) {
  const xhr = useRef<XMLHttpRequest | null>(null);
  const alive = useRef(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<MediaFeedback>();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      xhr.current?.abort();
    };
  }, []);

  async function upload(file: File) {
    if (disabled || xhr.current) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const contentType =
      file.type ||
      (
        {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        } as Record<string, string>
      )[extension || ""];
    if (
      !contentType ||
      !["image/jpeg", "image/png", "image/webp"].includes(contentType) ||
      !file.size ||
      file.size > MAX_PROJECT_IMAGE_BYTES
    ) {
      setFeedback({
        state: "error",
        message: "Choose a nonempty JPEG, PNG, or WebP image up to 10 MiB.",
      });
      return;
    }
    setFeedback(undefined);
    setProgress(0);
    onBusyChange(true);
    try {
      const body = await new Promise<unknown>((resolve, reject) => {
        const request = new XMLHttpRequest();
        xhr.current = request;
        request.open("POST", `/api/admin/catalog/${kind}/media`);
        request.setRequestHeader("Content-Type", contentType);
        request.timeout = 180000;
        request.upload.onprogress = (event) => {
          if (alive.current && event.lengthComputable)
            setProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => {
          let response;
          try {
            response = JSON.parse(request.responseText);
          } catch {
            reject(
              new Error("Upload service returned an unreadable response."),
            );
            return;
          }
          if (request.status >= 200 && request.status < 300)
            resolve(response.media);
          else
            reject(
              new ApiError(request.status, response.error || "Upload failed."),
            );
        };
        request.onerror = () =>
          reject(
            new Error(
              "Upload interrupted. Check your connection and try again.",
            ),
          );
        request.ontimeout = () =>
          reject(new Error("Upload timed out. Try a smaller image."));
        request.onabort = () => reject(new Error("Upload cancelled."));
        request.send(file);
      });
      if (!alive.current) return;
      const media = projectUploadSchema.parse(body);
      if (media.type !== "image")
        throw new Error("The upload service did not return an image.");
      onChange(media.src);
      setFeedback({
        state: "success",
        message: `Uploaded ${media.width} × ${media.height} px. Save the record to keep this image.`,
      });
    } catch (error) {
      if (!alive.current) return;
      if (error instanceof ApiError && error.status === 401) onExpired();
      setFeedback({
        state: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      xhr.current = null;
      if (alive.current) {
        setProgress(null);
        onBusyChange(false);
      }
    }
  }
  return (
    <div className="catalog-image-upload">
      <h2>{kind === "clients" ? "Client image" : "Skill icon"}</h2>
      <div className="catalog-image-preview">
        <ProjectThumbnail src={src} />
        <span className="muted">{src ? "Current image" : "No image yet"}</span>
      </div>
      <MediaUpload
        target={kind === "clients" ? "client" : "skill"}
        disabled={disabled || progress !== null}
        needsSave={false}
        feedback={feedback}
        onFile={(file) => void upload(file)}
      />
      {progress !== null && (
        <div className="catalog-upload-status">
          <span role="status">
            {progress === 100
              ? "Checking image…"
              : `Uploading image · ${progress}%`}
          </span>
          <button
            type="button"
            className="text-link"
            onClick={() => xhr.current?.abort()}
          >
            Cancel upload
          </button>
        </div>
      )}
      <small className="field-help">
        Uploads are publicly accessible, even before saving. Only upload
        approved public images. Replacing or clearing a URL does not delete the
        stored file.
      </small>
    </div>
  );
}
