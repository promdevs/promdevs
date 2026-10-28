"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { ArrowLeft, ArrowRight, Expand, Images, X } from "lucide-react";
import type { PublicProject } from "@promdevs/contracts";
import { ProjectImage } from "./ProjectImage";
import { MotionReveal } from "./MotionReveal";
import {
  isPortraitMedia,
  orderedProjectMedia,
  projectGalleryLayout,
} from "../lib/project-media";

type Media = PublicProject["gallery"][number];

function ProjectVideo({ item, title }: { item: Media; title: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div className="project-video-unavailable">
      <p>Video preview unavailable.</p>
      <a href={item.src} target="_blank" rel="noopener noreferrer">
        Open video
      </a>
    </div>
  ) : (
    <video
      controls
      playsInline
      preload="none"
      poster={item.poster || undefined}
      width={item.width}
      height={item.height}
      aria-label={item.alt || `${title} video`}
      onError={() => setFailed(true)}
    >
      <source src={item.src} />
      <a href={item.src}>Open video</a>
    </video>
  );
}

export function ProjectGallery({
  media,
  title,
}: {
  media: Media[];
  title: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLAnchorElement | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const ordered = orderedProjectMedia(media);
  const layout = projectGalleryLayout(ordered);
  const images = ordered.filter((item) => item.type === "image");
  const active = selected === null ? null : images[selected];

  useEffect(() => {
    if (selected === null) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [selected]);

  function open(event: MouseEvent<HTMLAnchorElement>, item: Media) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      !dialog.current?.showModal
    )
      return;
    event.preventDefault();
    trigger.current = event.currentTarget;
    setSelected(images.indexOf(item));
    dialog.current.showModal();
  }
  function close() {
    dialog.current?.close();
  }
  function move(direction: number) {
    setSelected((index) =>
      index === null
        ? null
        : (index + direction + images.length) % images.length,
    );
  }

  if (!media.length) return null;
  return (
    <section
      id="project-gallery"
      className="project-gallery"
      aria-labelledby="project-gallery-heading"
    >
      <div className="project-gallery-heading">
        <h2 id="project-gallery-heading">A closer look.</h2>
        <span>
          <Images size={16} aria-hidden="true" />
          {ordered.length}{" "}
          {images.length === ordered.length
            ? ordered.length === 1
              ? "image"
              : "images"
            : "previews"}
        </span>
      </div>
      <div className={`project-gallery-grid project-gallery-${layout}`}>
        {ordered.map((item, index) => (
          <MotionReveal
            key={`${item.src}-${index}`}
            className={`project-gallery-item${isPortraitMedia(item) ? " project-gallery-portrait" : layout === "editorial" && (index === 0 || (item.width && item.height && item.width / item.height >= 1.65)) ? " project-gallery-wide" : ""}`}
          >
            <figure>
              <div
                className="project-gallery-frame"
                style={{
                  aspectRatio:
                    item.width && item.height
                      ? `${item.width} / ${item.height}`
                      : "16 / 10",
                }}
              >
                {item.type === "image" ? (
                  <a
                    href={item.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => open(event, item)}
                    aria-label={`Enlarge ${item.alt || `${title} image ${index + 1}`}`}
                  >
                    <ProjectImage
                      src={item.src}
                      alt={item.alt || `${title} image ${index + 1}`}
                      contain
                      sizes={
                        isPortraitMedia(item)
                          ? "(min-width: 900px) 360px, 45vw"
                          : "(min-width: 900px) 80vw, 92vw"
                      }
                    />
                    <span className="project-gallery-expand">
                      <Expand size={18} aria-hidden="true" />
                    </span>
                  </a>
                ) : (
                  <ProjectVideo item={item} title={title} />
                )}
              </div>
              {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
          </MotionReveal>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="project-lightbox"
        aria-labelledby="project-lightbox-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          setSelected(null);
          trigger.current?.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (
            images.length < 2 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          )
            return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        <div className="project-lightbox-toolbar">
          <p id="project-lightbox-title">
            {title}
            <span className="project-lightbox-counter" aria-live="polite">
              {selected !== null && ` ${selected + 1} / ${images.length}`}
            </span>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close enlarged image"
            autoFocus
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {active && (
          <div className="project-lightbox-image">
            <ProjectImage
              src={active.src}
              alt={active.alt || `${title} enlarged image`}
              contain
              priority
              sizes="95vw"
            />
          </div>
        )}
        <div className="project-lightbox-bottom">
          <p>{active?.caption || active?.alt}</p>
          {images.length > 1 && (
            <div className="project-lightbox-navigation">
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => move(-1)}
              >
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => move(1)}
              >
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
}
