"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { RibbonController } from "./createRibbonScene";

export function RibbonHero() {
  const mount = useRef<HTMLDivElement>(null);
  const controller = useRef<RibbonController | null>(null);
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
        const { createRibbonScene } = await import("./createRibbonScene");
        if (disposed) return;
        const scene = createRibbonScene(node, () => {
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
          "Ribbon scene unavailable; using the static poster.",
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
      className="ribbon-figure"
      aria-label="An impossible ribbon sculpture, continuously unfolding"
    >
      <div className="ribbon-stage" data-ready={ready}>
        {/* A local render of the same scene also works without JavaScript or WebGL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ribbon-light.png"
          alt=""
          width="1600"
          height="900"
          className="ribbon-poster ribbon-poster-light"
          fetchPriority="high"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ribbon-dark.png"
          alt=""
          width="1600"
          height="900"
          className="ribbon-poster ribbon-poster-dark"
        />
        <div ref={mount} className="ribbon-canvas" aria-hidden="true" />
      </div>
      {ready && (
        <button
          type="button"
          className="ribbon-pause"
          aria-label={
            paused ? "Resume ribbon animation" : "Pause ribbon animation"
          }
          aria-pressed={paused}
          onClick={() => {
            const next = !paused;
            setPaused(next);
            controller.current?.setPaused(next);
          }}
        >
          {paused ? (
            <Play size={13} aria-hidden />
          ) : (
            <Pause size={13} aria-hidden />
          )}
        </button>
      )}
    </figure>
  );
}
