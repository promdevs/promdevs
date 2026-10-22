"use client";

import { type ReactNode, useEffect, useRef } from "react";
import styles from "./sections/AITools.module.css";

export function ToolMarquee({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let visible = true;
    const suspend = () => {
      node.dataset.suspended = String(!visible || document.hidden);
    };
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            suspend();
          })
        : null;
    observer?.observe(node);
    document.addEventListener("visibilitychange", suspend);
    suspend();
    node.dataset.ready = "true";
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", suspend);
      delete node.dataset.ready;
      delete node.dataset.suspended;
    };
  }, []);

  return (
    <div className={styles.marquee} ref={root}>
      <div
        className={styles.viewport}
        tabIndex={0}
        role="group"
        aria-label="Tools we work with. Animation pauses while focused."
      >
        <div className={styles.track}>{children}</div>
      </div>
    </div>
  );
}
