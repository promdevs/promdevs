import {
  clamp,
  followWorkPosition,
  workCardLayout,
  workCardPresentation,
  workRailPosition,
  workRailTravel,
} from "./work-rail-motion";

export function createWorkRail(root: HTMLElement) {
  const cards = Array.from(
    root.querySelectorAll<HTMLElement>(".work-rail-project"),
  );
  if (
    cards.length < 2 ||
    !("ResizeObserver" in window) ||
    !("IntersectionObserver" in window)
  )
    return;
  const track = root.querySelector<HTMLElement>(".work-rail-track")!;
  const sticky = root.querySelector<HTMLElement>(".work-rail-sticky")!;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const opts = { signal: events.signal };
  let raf = 0,
    disposed = false,
    visible = true,
    dirty = true;
  let previousFrame = 0;
  let position = 0,
    target = 0,
    start = 0,
    travel = 0,
    stride = 0,
    leadingEdge = 0;
  let enabled = false,
    focused = -1;
  let drawn: number[] = [];

  const restore = () => {
    delete root.dataset.enhanced;
    root.style.removeProperty("height");
    for (const property of [
      "--work-card-width",
      "--work-card-height",
      "--work-cover-height",
    ])
      root.style.removeProperty(property);
    track.removeAttribute("style");
    cards.forEach((card) => {
      card.removeAttribute("style");
      card.inert = false;
    });
    drawn = [];
  };
  const draw = () => {
    if (!enabled) return;
    track.style.transform = `translate3d(${leadingEdge - position * stride}px, 0, 0)`;
    const nearby: number[] = [];
    for (
      let index = Math.max(0, Math.floor(position) - 1);
      index < Math.min(cards.length, Math.ceil(position) + 2);
      index++
    ) {
      if (Math.abs(index - position) < 1.65) nearby.push(index);
    }
    for (const index of drawn)
      if (!nearby.includes(index)) {
        cards[index].style.opacity = "0";
        cards[index].style.visibility = "hidden";
        cards[index].inert = true;
      }
    for (const index of nearby) {
      const { opacity, scale, y } = workCardPresentation(index - position);
      cards[index].style.opacity = String(opacity);
      cards[index].style.visibility = opacity > 0.01 ? "visible" : "hidden";
      cards[index].style.transform = `translateY(${y}px) scale(${scale})`;
      cards[index].inert = opacity < 0.3;
    }
    drawn = nearby;
    root.dataset.active = String(Math.round(position));
    const active = Math.round(position);
    for (const index of [active - 1, active, active + 1]) {
      const image = cards[index]?.querySelector("img");
      if (image) image.loading = "eager";
    }
  };
  const measure = () => {
    dirty = false;
    const width = document.documentElement.clientWidth;
    const header =
      document.querySelector(".site-header")?.getBoundingClientRect().height ??
      80;
    const top = header + (width < 700 ? 12 : 24);
    const { split, width: cardWidth, gap, padding } = workCardLayout(width);
    root.style.setProperty("--work-rail-width", `${width}px`);
    root.style.setProperty("--work-card-width", `${cardWidth}px`);
    root.style.setProperty("--work-rail-gap", `${gap}px`);
    root.style.setProperty("--work-rail-top", `${top}px`);
    root.style.setProperty("--work-card-height", "auto");
    // Measure intrinsic copy, not the stretched grid column beside the image.
    const metadata = Math.max(
      ...cards.map((card) => {
        const details = card.querySelector<HTMLElement>(".work-rail-details")!;
        const style = getComputedStyle(details);
        return (
          Array.from(details.children).reduce(
            (height, child) => height + (child as HTMLElement).offsetHeight,
            0,
          ) +
          parseFloat(style.rowGap) * (details.children.length - 1) +
          parseFloat(style.paddingTop) +
          parseFloat(style.paddingBottom)
        );
      }),
    );
    const available = window.innerHeight - top - 32;
    const maxImage = available - padding * 2 - 42;
    enabled =
      !reduced.matches &&
      maxImage >= (split ? Math.max(128, metadata) : metadata + 128);
    if (!enabled) {
      restore();
      return;
    }
    root.dataset.enhanced = "true";
    const imageHeight = split
      ? Math.max(metadata, Math.min(400, maxImage))
      : Math.min(width < 700 ? 260 : 340, maxImage - metadata);
    root.style.setProperty("--work-cover-height", `${imageHeight}px`);
    root.style.setProperty(
      "--work-card-height",
      `${imageHeight + (split ? 0 : metadata) + padding * 2 + 2}px`,
    );
    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.visibility = "hidden";
      card.inert = true;
    });
    travel = workRailTravel(cards.length, window.innerHeight);
    const stageHeight = sticky.offsetHeight;
    const placement = workRailPosition(
      width,
      window.innerHeight,
      header,
      root.getBoundingClientRect().left,
      stageHeight,
    );
    root.style.setProperty("--work-rail-top", `${placement.top}px`);
    root.style.height = `${stageHeight + travel}px`;
    stride = cardWidth + gap;
    leadingEdge = placement.left;
    start = root.getBoundingClientRect().top + window.scrollY - placement.top;
    if (focused < 0)
      position = target =
        clamp((window.scrollY - start) / travel) * (cards.length - 1);
    draw();
  };
  const tick = (timestamp: number) => {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    if (dirty) measure();
    if (!enabled) return;
    if (focused < 0)
      target = clamp((window.scrollY - start) / travel) * (cards.length - 1);
    const elapsed = previousFrame ? timestamp - previousFrame : 1000 / 60;
    previousFrame = timestamp;
    position = followWorkPosition(position, target, elapsed);
    if (Math.abs(target - position) < 0.001) position = target;
    draw();
    if (position !== target) schedule();
    else previousFrame = 0;
  };
  const schedule = () => {
    if (!raf && !disposed && visible && !document.hidden)
      raf = requestAnimationFrame(tick);
  };
  const resize = () => {
    dirty = true;
    schedule();
  };
  window.addEventListener("scroll", schedule, { ...opts, passive: true });
  window.addEventListener("resize", resize, opts);
  reduced.addEventListener("change", resize, opts);
  root.addEventListener(
    "focusin",
    (event) => {
      const article = (event.target as Element).closest<HTMLElement>(
        ".work-rail-project",
      );
      const index = article ? cards.indexOf(article) : -1;
      if (
        !enabled ||
        index < 0 ||
        !(event.target as Element).matches(":focus-visible")
      )
        return;
      focused = index;
      position = target = index;
      root.querySelector(".work-rail-window")!.scrollLeft = 0;
      window.scrollTo({
        top: Math.max(0, start + (index / (cards.length - 1)) * travel),
        behavior: "instant",
      });
      draw();
    },
    opts,
  );
  root.addEventListener(
    "focusout",
    (event) => {
      const related = (event as FocusEvent).relatedTarget;
      if (
        !(related instanceof Element) ||
        !related.closest(".work-rail-project")
      )
        focused = -1;
      schedule();
    },
    opts,
  );
  root.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement)
        event.target
          .closest(".work-rail-cover")
          ?.setAttribute("data-failed", "true");
    },
    { ...opts, capture: true },
  );
  root.querySelectorAll("img").forEach((image) => {
    if (image.complete && !image.naturalWidth)
      image.closest(".work-rail-cover")?.setAttribute("data-failed", "true");
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        previousFrame = 0;
      } else schedule();
    },
    opts,
  );
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        dirty = true;
        schedule();
      } else {
        cancelAnimationFrame(raf);
        raf = 0;
        previousFrame = 0;
      }
    },
    { rootMargin: "100px" },
  );
  observer.observe(root);
  let width = root.clientWidth,
    height = document.body.offsetHeight;
  const sizing = new ResizeObserver(() => {
    if (root.clientWidth !== width || document.body.offsetHeight !== height) {
      width = root.clientWidth;
      height = document.body.offsetHeight;
      resize();
    }
  });
  sizing.observe(root);
  sizing.observe(document.body);
  document.fonts.ready.then(() => {
    if (!disposed) resize();
  });
  measure();
  schedule();
  return () => {
    disposed = true;
    events.abort();
    observer.disconnect();
    sizing.disconnect();
    cancelAnimationFrame(raf);
    restore();
    root.removeAttribute("style");
    delete root.dataset.active;
  };
}
