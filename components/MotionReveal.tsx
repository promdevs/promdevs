"use client";
import { type ReactNode, useEffect, useRef } from "react";
export function MotionReveal({
  children,
  className = "",
  delayMs = 0,
  entrance = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  entrance?: boolean;
  as?: "div" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window) || !node.animate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    let animation: Animation | undefined;
    let disposed = false;
    let revealed = false;
    const reveal = (immediate = false) => {
      if (disposed || revealed) return;
      revealed = true;
      observer?.disconnect();
      delete node.dataset.pending;
      if (!immediate && !reduced.matches) {
        animation = node.animate(
          [
            {
              opacity: entrance ? 0.72 : 0,
              transform: `translateY(${entrance ? 14 : 18}px)`,
            },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 650,
            delay: delayMs,
            easing: "cubic-bezier(.2,.75,.2,1)",
            fill: "backwards",
          },
        );
      }
    };
    const showImmediately = () => {
      reveal(true);
      animation?.cancel();
    };
    const preference = () => {
      if (reduced.matches) showImmediately();
    };
    if (reduced.matches) reveal(true);
    else if (entrance) document.fonts.ready.then(() => reveal());
    else if (node.getBoundingClientRect().top < window.innerHeight)
      reveal(true);
    else {
      node.dataset.pending = "true";
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) reveal();
        },
        { rootMargin: "0px 0px -24px 0px" },
      );
      observer.observe(node);
    }
    reduced.addEventListener("change", preference);
    node.addEventListener("focusin", showImmediately);
    return () => {
      disposed = true;
      observer?.disconnect();
      animation?.cancel();
      reduced.removeEventListener("change", preference);
      node.removeEventListener("focusin", showImmediately);
      delete node.dataset.pending;
    };
  }, [delayMs, entrance]);
  return (
    <Tag
      ref={(node) => {
        ref.current = node;
      }}
      className={"motion-reveal " + className}
    >
      {children}
    </Tag>
  );
}
