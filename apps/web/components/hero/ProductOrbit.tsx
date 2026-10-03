"use client";

import { useEffect, useRef } from "react";

const nodes = [
  { label: "design", x: 28, y: 17 },
  { label: "build", x: 81, y: 46 },
  { label: "ship", x: 68, y: 81 },
];

export function ProductOrbit() {
  const visual = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = visual.current;
    if (!element) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const reset = () => {
      element.style.setProperty("--light-x", "50%");
      element.style.setProperty("--light-y", "48%");
      element
        .querySelectorAll<HTMLElement>("[data-orbit-node]")
        .forEach((node) => {
          node.style.setProperty("--node-x", "0px");
          node.style.setProperty("--node-y", "0px");
        });
    };

    const move = (event: PointerEvent) => {
      if (
        !finePointer.matches ||
        reducedMotion.matches ||
        event.pointerType === "touch"
      )
        return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );
        element.style.setProperty("--light-x", `${38 + x * 24}%`);
        element.style.setProperty("--light-y", `${38 + y * 22}%`);

        element
          .querySelectorAll<HTMLElement>("[data-orbit-node]")
          .forEach((node) => {
            const nodeX = Number(node.dataset.x) / 100;
            const nodeY = Number(node.dataset.y) / 100;
            const dx = nodeX - x;
            const dy = nodeY - y;
            const distance = Math.hypot(dx, dy);
            const influence = Math.max(0, 1 - distance / 0.32);
            const length = distance || 1;
            node.style.setProperty(
              "--node-x",
              `${(dx / length) * influence * 9}px`,
            );
            node.style.setProperty(
              "--node-y",
              `${(dy / length) * influence * 9}px`,
            );
          });
      });
    };

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", reset);
    reducedMotion.addEventListener("change", reset);
    reset();
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div ref={visual} className="product-orbit" aria-hidden="true">
      <div className="product-orbit-light" />
      <svg
        className="product-orbit-lines"
        viewBox="0 0 680 620"
        role="presentation"
      >
        <path
          className="orbit-path orbit-path-a"
          d="M64 86C228 12 267 172 406 190C546 208 638 279 604 431"
        />
        <path
          className="orbit-path orbit-path-b"
          d="M482 48C646 90 671 278 608 420C540 575 309 589 210 458"
        />
        <path
          className="orbit-path orbit-path-c"
          d="M138 70C256 127 268 258 439 302C620 349 641 489 527 561"
        />
      </svg>

      <span className="orbit-cross orbit-cross-a" />
      <span className="orbit-cross orbit-cross-b" />
      <span className="orbit-speck orbit-speck-a" />
      <span className="orbit-speck orbit-speck-b" />
      <span className="orbit-speck orbit-speck-c" />

      {nodes.map((node, index) => (
        <span
          key={node.label}
          className={`product-orbit-node product-orbit-node-${index + 1}`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          data-orbit-node
          data-x={node.x}
          data-y={node.y}
        >
          <span className="product-orbit-node-inner">
            <i />
            {node.label}
          </span>
        </span>
      ))}
    </div>
  );
}
