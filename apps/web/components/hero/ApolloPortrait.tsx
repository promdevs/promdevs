"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function ApolloPortrait() {
  const stage = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = stage.current!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const fine = matchMedia("(hover: hover) and (pointer: fine)");
    let visible = false;
    let frame = 0;
    let bounds = element.getBoundingClientRect();
    const sync = () => {
      element.dataset.running = String(
        visible && !document.hidden && !reduced.matches && !pausedRef.current,
      );
    };
    const reset = () => {
      cancelAnimationFrame(frame);
      element.style.setProperty("--apollo-x", "0px");
      element.style.setProperty("--apollo-y", "0px");
      element.style.setProperty("--apollo-tilt", "0deg");
    };
    const enter = () => {
      bounds = element.getBoundingClientRect();
    };
    const move = (event: PointerEvent) => {
      if (
        !fine.matches ||
        reduced.matches ||
        pausedRef.current ||
        event.pointerType === "touch"
      )
        return;
      const x = Math.max(
        -1,
        Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
      );
      const y = Math.max(
        -1,
        Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--apollo-x", `${x * 7}px`);
        element.style.setProperty("--apollo-y", `${y * 4}px`);
        element.style.setProperty("--apollo-tilt", `${x * 0.7}deg`);
      });
    };
    const leave = () => {
      if (!pausedRef.current) reset();
    };
    const preference = () => {
      reset();
      sync();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    element.dataset.enhanced = "true";
    syncRef.current = sync;
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", preference);
    fine.addEventListener("change", preference);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", preference);
      fine.removeEventListener("change", preference);
      delete element.dataset.enhanced;
      delete element.dataset.running;
      syncRef.current = () => {};
    };
  }, []);

  return (
    <div ref={stage} className="apollo-portrait" data-paused={paused}>
      <div className="apollo-portrait-fade" aria-hidden="true">
        <div className="apollo-portrait-parallax">
          <svg
            className="apollo-portrait-art"
            viewBox="0 0 1024 1536"
            focusable="false"
            aria-hidden="true"
          >
            <image href="/images/apollo-hero.webp" width="1024" height="1536" />
          </svg>
        </div>
      </div>
      <button
        type="button"
        className="apollo-portrait-pause"
        aria-label={
          paused ? "Resume sculpture motion" : "Pause sculpture motion"
        }
        onClick={() => {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
          syncRef.current();
        }}
      >
        {paused ? (
          <Play size={16} aria-hidden />
        ) : (
          <Pause size={16} aria-hidden />
        )}
      </button>
    </div>
  );
}
