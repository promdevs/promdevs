"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { ApolloController } from "./createApolloScene";

export function ApolloHero() {
  const mount = useRef<HTMLDivElement>(null);
  const controller = useRef<ApolloController | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    let disposed = false;
    let starting = false;
    let failed = false;
    let visible = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () =>
      controller.current?.setActive(
        visible && !document.hidden && !motion.matches,
      );
    const start = async () => {
      if (starting || motion.matches || disposed) return;
      starting = true;
      try {
        const { createApolloScene } = await import("./createApolloScene");
        if (disposed) return;
        const scene = await createApolloScene(node, () => {
          failed = true;
          if (!disposed) setReady(false);
        });
        if (disposed) {
          scene.dispose();
          return;
        }
        controller.current = scene;
        scene.setDark(document.documentElement.classList.contains("dark"));
        setReady(!motion.matches);
        sync();
      } catch (error) {
        console.warn(
          "Apollo scene unavailable; using the static poster.",
          error,
        );
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) void start();
        sync();
      },
      { rootMargin: "100px" },
    );
    observer.observe(node);
    const themeObserver = new MutationObserver(() => {
      controller.current?.setDark(
        document.documentElement.classList.contains("dark"),
      );
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    const preference = () => {
      setReady(!!controller.current && !motion.matches && !failed);
      if (!motion.matches && visible) void start();
      sync();
    };
    motion.addEventListener("change", preference);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      themeObserver.disconnect();
      motion.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", sync);
      controller.current?.dispose();
      controller.current = null;
    };
  }, []);

  return (
    <figure
      className="apollo-figure"
      aria-label="Apollo, reimagined as a marble sculptural developer, typing at a keyboard"
    >
      <div className="apollo-stage" data-ready={ready}>
        {/* A local render of the same scene also works without JavaScript or WebGL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/apollo-poster.png"
          alt=""
          width="1000"
          height="1100"
          className="apollo-poster"
          fetchPriority="high"
        />
        <div ref={mount} className="apollo-canvas" aria-hidden="true" />
      </div>
      <div className="apollo-caption">
        <figcaption>
          <span className="apollo-dot" /> Classical thinking. Modern execution.
        </figcaption>
        {ready && (
          <button
            type="button"
            className="apollo-pause"
            aria-label={
              paused ? "Resume Apollo animation" : "Pause Apollo animation"
            }
            aria-pressed={paused}
            onClick={() => {
              const next = !paused;
              setPaused(next);
              controller.current?.setPaused(next);
            }}
          >
            {paused ? (
              <Play size={14} aria-hidden />
            ) : (
              <Pause size={14} aria-hidden />
            )}
          </button>
        )}
      </div>
    </figure>
  );
}
