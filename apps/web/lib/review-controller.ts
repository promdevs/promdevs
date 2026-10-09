import { reviewReadingTime } from "./client-stories-motion";

export function createReviewRotation(
  root: HTMLElement,
  now = () => performance.now(),
) {
  const figures = Array.from(
    root.querySelectorAll<HTMLElement>(".client-quote"),
  );
  if (!figures.length || !("IntersectionObserver" in window)) return;
  const section = root.closest("section") ?? root;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const progress = root.querySelector<HTMLElement>(".review-progress-fill");
  const timingLabel = root.querySelector<HTMLElement>(".review-timing-label");
  const announcement = root.querySelector<HTMLElement>(".review-announcement");
  const events = new AbortController();
  const options = { signal: events.signal };
  let index = 0,
    visible = false,
    hover = fine.matches && section.matches(":hover"),
    touching = false;
  let disposed = false,
    transitioning = false,
    generation = 0,
    destination: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let animations: Animation[] = [],
    progressAnimation: Animation | undefined;
  let duration = 0,
    remaining = 0,
    deadline = 0;

  const selectedText = () => {
    const selection = window.getSelection();
    return Boolean(
      selection &&
      !selection.isCollapsed &&
      ((selection.anchorNode && section.contains(selection.anchorNode)) ||
        (selection.focusNode && section.contains(selection.focusNode))),
    );
  };
  const blocked = () =>
    disposed ||
    reduced.matches ||
    !visible ||
    document.hidden ||
    hover ||
    touching ||
    section.contains(document.activeElement) ||
    selectedText();
  const suspend = () => {
    if (timer !== undefined)
      remaining = Math.max(0, Math.min(duration, deadline - now()));
    clearTimeout(timer);
    timer = undefined;
    progressAnimation?.pause();
    root.dataset.playing = "false";
  };
  const present = () =>
    figures.forEach((figure, i) => {
      figure.dataset.active = String(i === index);
      delete figure.dataset.entering;
      figure.inert = i !== index;
      figure.setAttribute("aria-hidden", String(i !== index));
    });
  const resetHold = () => {
    suspend();
    duration = reviewReadingTime(
      figures[index].querySelector("blockquote")?.textContent ?? "",
    );
    remaining = duration;
    progressAnimation?.cancel();
    progressAnimation = undefined;
    if (!reduced.matches && figures.length > 1 && progress?.animate) {
      progressAnimation = progress.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration, easing: "linear", fill: "both" },
      );
      progressAnimation.pause();
      progressAnimation.currentTime = 0;
    }
  };
  const schedule = () => {
    if (blocked() || transitioning || figures.length < 2 || timer !== undefined)
      return;
    deadline = now() + remaining;
    timer = setTimeout(() => {
      timer = undefined;
      remaining = 0;
      progressAnimation?.pause();
      if (progressAnimation) progressAnimation.currentTime = duration;
      change(1, false);
    }, remaining);
    if (progressAnimation) {
      progressAnimation.currentTime = duration - remaining;
      progressAnimation.play();
    }
    root.dataset.playing = "true";
    if (timingLabel) timingLabel.textContent = "Next review";
  };
  const cancelTransition = () => {
    generation++;
    animations.forEach((animation) => animation.cancel());
    animations = [];
    transitioning = false;
    destination = null;
    root.removeAttribute("aria-busy");
  };
  function complete(next: number, manual: boolean) {
    cancelTransition();
    index = next;
    present();
    resetHold();
    if (manual && announcement) {
      const author =
        figures[index].querySelector(".quote-author")?.textContent ?? "";
      announcement.textContent = `Review ${index + 1} of ${figures.length}. ${author}`;
    }
    sync();
  }
  const animate = (
    node: Element,
    frames: Keyframe[],
    time: number,
    delay = 0,
  ) => {
    animations.push(
      node.animate(frames, {
        duration: time,
        delay,
        easing: "cubic-bezier(.2,.75,.2,1)",
        fill: "both",
      }),
    );
  };
  function change(step: number, manual: boolean) {
    if (disposed || figures.length < 2 || (!manual && blocked())) return;
    if (transitioning) complete(destination ?? index, false);
    suspend();
    const next = (index + step + figures.length) % figures.length;
    if (reduced.matches || !root.animate) {
      complete(next, manual);
      return;
    }
    transitioning = true;
    destination = next;
    root.setAttribute("aria-busy", "true");
    const version = ++generation,
      outgoing = figures[index],
      incoming = figures[next];
    incoming.dataset.entering = "true";
    animate(
      outgoing,
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-10px)" },
      ],
      500,
    );
    animate(incoming, [{ opacity: 0 }, { opacity: 1 }], 850, 220);
    animate(
      incoming.querySelector("blockquote")!,
      [
        { clipPath: "inset(0 0 100% 0)", transform: "translateY(16px)" },
        { clipPath: "inset(0 0 0% 0)", transform: "translateY(0)" },
      ],
      1000,
      180,
    );
    animate(
      incoming.querySelector("figcaption")!,
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      850,
      350,
    );
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (!disposed && version === generation) complete(next, manual);
      })
      .catch(() => {});
  }
  function sync() {
    if (disposed) return;
    root.dataset.enhanced = "true";
    root.dataset.autoplay = String(!reduced.matches && figures.length > 1);
    if (!transitioning) present();
    if (blocked()) {
      suspend();
      if (timingLabel) timingLabel.textContent = "Paused while reading";
      if (!visible || document.hidden)
        animations.forEach((animation) => animation.pause());
      else if (
        transitioning &&
        (figures[index].contains(document.activeElement) || selectedText())
      ) {
        // Retain focused links and selected text on their original review.
        cancelTransition();
        present();
        resetHold();
      } else animations.forEach((animation) => animation.play());
    } else if (transitioning)
      animations.forEach((animation) => animation.play());
    else schedule();
  }
  root
    .querySelectorAll<HTMLButtonElement>("[data-review-direction]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => change(Number(button.dataset.reviewDirection), true),
        options,
      );
    });
  root.addEventListener(
    "keydown",
    (event) => {
      if (
        event.target !== root ||
        !["ArrowLeft", "ArrowRight"].includes(event.key)
      )
        return;
      event.preventDefault();
      change(event.key === "ArrowLeft" ? -1 : 1, true);
    },
    options,
  );
  section.addEventListener(
    "pointerenter",
    (event) => {
      if (event.pointerType !== "touch" && fine.matches) {
        hover = true;
        sync();
      }
    },
    options,
  );
  section.addEventListener(
    "pointerleave",
    () => {
      hover = false;
      sync();
    },
    options,
  );
  section.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "touch") {
        touching = true;
        sync();
      }
    },
    { ...options, passive: true },
  );
  const endTouch = () => {
    if (touching) {
      touching = false;
      sync();
    }
  };
  window.addEventListener("pointerup", endTouch, options);
  window.addEventListener("pointercancel", endTouch, options);
  section.addEventListener("focusin", sync, options);
  section.addEventListener("focusout", () => queueMicrotask(sync), options);
  document.addEventListener("selectionchange", sync, options);
  document.addEventListener("visibilitychange", sync, options);
  reduced.addEventListener(
    "change",
    () => {
      if (transitioning) complete(destination ?? index, false);
      resetHold();
      sync();
    },
    options,
  );
  fine.addEventListener(
    "change",
    () => {
      if (!fine.matches) hover = false;
      sync();
    },
    options,
  );
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.15 },
  );
  resetHold();
  observer.observe(root);
  sync();
  return () => {
    disposed = true;
    events.abort();
    observer.disconnect();
    suspend();
    cancelTransition();
    progressAnimation?.cancel();
    delete root.dataset.enhanced;
    delete root.dataset.autoplay;
    delete root.dataset.playing;
    figures.forEach((figure) => {
      figure.inert = false;
      figure.removeAttribute("aria-hidden");
      delete figure.dataset.entering;
    });
  };
}
