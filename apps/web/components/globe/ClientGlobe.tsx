"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { WorkCountry } from "@/data/countries";
import type { GlobeController, MarkerProjection } from "./globe-scene";

export function ClientGlobe({ countries }: { countries: WorkCountry[] }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<GlobeController | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const pinned = useRef<string | null>(null);

  useEffect(() => {
    const node = root.current,
      mount = stage.current;
    if (!node || !mount || !("IntersectionObserver" in window)) return;
    let disposed = false,
      loading = false,
      visible = false,
      hovered = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    const events = new AbortController();
    const options = { signal: events.signal };
    const markers = new Map(
      Array.from(node.querySelectorAll<HTMLElement>(".globe-marker")).map(
        (marker) => [marker.dataset.country!, marker],
      ),
    );
    const sync = () => {
      controller.current?.setPaused(
        hovered ||
          (node.contains(document.activeElement) &&
            Boolean(document.activeElement?.matches(":focus-visible"))),
      );
      controller.current?.setActive(visible && !document.hidden);
    };
    const theme = () =>
      controller.current?.setTheme(
        document.documentElement.classList.contains("dark"),
      );
    const motion = () => controller.current?.setReduced(reduced.matches);
    const project = (positions: MarkerProjection[]) => {
      positions.forEach((position) => {
        const marker = markers.get(position.code);
        if (!marker) return;
        marker.hidden = position.opacity <= 0.01;
        marker.inert = position.opacity <= 0.01;
        marker.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        marker.style.opacity = String(position.opacity);
        marker.dataset.side = position.side;
      });
    };
    const failure = () => {
      mount
        .querySelector("canvas")
        ?.removeEventListener("webglcontextlost", failure);
      delete node.dataset.ready;
      markers.forEach((marker) => {
        marker.hidden = true;
        marker.inert = true;
      });
      controller.current?.dispose();
      controller.current = null;
    };
    async function load() {
      if (loading || disposed) return;
      loading = true;
      try {
        const { createGlobe } = await import("./globe-scene");
        if (disposed) return;
        controller.current = createGlobe(mount!, countries, project);
        theme();
        motion();
        sync();
        node!.dataset.ready = "true";
        mount!
          .querySelector("canvas")
          ?.addEventListener("webglcontextlost", failure);
      } catch {
        if (!disposed) failure();
      }
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) void load();
        sync();
      },
      { threshold: 0.05 },
    );
    const themeObserver = new MutationObserver(theme);
    observer.observe(node);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    node.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType !== "touch" && fine.matches) {
          hovered = true;
          sync();
        }
      },
      options,
    );
    node.addEventListener(
      "pointerleave",
      () => {
        hovered = false;
        sync();
      },
      options,
    );
    node.addEventListener("focusin", sync, options);
    node.addEventListener("keydown", sync, options);
    node.addEventListener(
      "focusout",
      () =>
        queueMicrotask(() => {
          if (!disposed) sync();
        }),
      options,
    );
    document.addEventListener("visibilitychange", sync, options);
    reduced.addEventListener("change", motion, options);
    fine.addEventListener(
      "change",
      () => {
        if (!fine.matches) hovered = false;
        sync();
      },
      options,
    );
    return () => {
      disposed = true;
      events.abort();
      observer.disconnect();
      themeObserver.disconnect();
      mount
        .querySelector("canvas")
        ?.removeEventListener("webglcontextlost", failure);
      controller.current?.dispose();
      controller.current = null;
      delete node.dataset.ready;
    };
  }, [countries]);

  return (
    <div
      ref={root}
      className="client-globe"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          pinned.current = null;
          setSelected(null);
        }
      }}
    >
      <div
        className="globe-art"
        role="group"
        aria-label="Interactive world globe"
        aria-describedby="globe-interaction-hint"
        tabIndex={0}
      >
        <p id="globe-interaction-hint" className="sr-only">
          Drag horizontally or use the arrow keys to rotate. Rotation pauses
          while focused.
          {countries.length > 0 &&
            " Blue markers represent verified countries we have worked with, independently of the reviews."}
        </p>
        <Image
          src="/images/globe-poster.svg"
          alt=""
          fill
          sizes="(max-width: 899px) 90vw, 50vw"
          unoptimized
          className="globe-poster"
        />
        <div ref={stage} className="globe-canvas" />
        <div className="globe-marker-layer">
          {countries.map((country) => (
            <div
              key={country.code}
              className="globe-marker"
              data-country={country.code}
              hidden
            >
              <button
                type="button"
                className="globe-marker-point"
                aria-label={`Explore ${country.name}`}
                aria-expanded={selected === country.code}
                aria-describedby={
                  selected === country.code
                    ? `globe-location-${country.code}`
                    : undefined
                }
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") setSelected(country.code);
                }}
                onPointerLeave={() => {
                  setSelected(pinned.current);
                }}
                onFocus={() => setSelected(country.code)}
                onBlur={() => {
                  setSelected(pinned.current);
                }}
                onClick={() => {
                  pinned.current =
                    pinned.current === country.code ? null : country.code;
                  setSelected(pinned.current);
                }}
              >
                <span aria-hidden="true" />
              </button>
              {selected === country.code && (
                <div
                  className="globe-marker-note"
                  id={`globe-location-${country.code}`}
                >
                  <strong>{country.name}</strong>
                  {country.detail && <span>{country.detail}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
