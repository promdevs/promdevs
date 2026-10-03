const PHRASES = [
  "DESIGN",
  "BUILD",
  "WEB APPS",
  "MOBILE APPS",
  "AI PRODUCTS",
  "APP RESCUE",
  "SHIP",
];
const HOLD = 4000;
const DURATION = 1500;
const INK = "var(--ink)";
const BLUE = "#2563eb";

type Position = {
  character: string;
  x: number;
  y: number;
  width: number;
  blue: boolean;
};
type Letter = {
  node: HTMLSpanElement;
  glyph: HTMLSpanElement;
  position: Position | null;
};
export type LetterController = {
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

const transform = (x: number, y: number, rotation = 0) =>
  `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;

export function createLetterController(
  stage: HTMLElement,
  onAvailable: (value: boolean) => void,
): LetterController {
  const pool = stage.querySelector<HTMLElement>(".letter-pool")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const letters: Letter[] = Array.from({ length: 20 }, () => {
    const node = document.createElement("span");
    const glyph = document.createElement("span");
    node.className = "moving-letter";
    glyph.className = "moving-glyph";
    node.append(glyph);
    pool.append(node);
    return { node, glyph, position: null };
  });
  let layouts: Position[][] = [];
  let index = 0;
  let destination: number | null = null;
  let animations: Animation[] = [];
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let started = 0;
  let remaining = HOLD;
  let disposed = false;
  let ready = false;
  let paused = false;
  let visible = false;
  let hovering = false;
  let pointerFrame = 0;
  let resizeFrame = 0;
  let bounds = stage.getBoundingClientRect();
  let fontSize = 60;
  let mobile = false;

  const suspended = () =>
    paused || !visible || document.hidden || reduced.matches || !ready;
  const stopTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - started));
    }
  };
  const resetPointer = () => {
    cancelAnimationFrame(pointerFrame);
    letters.forEach(({ glyph }) => {
      glyph.style.transform = "";
    });
  };
  const cancelAnimations = () => {
    generation++;
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };
  const place = (letter: Letter, position: Position | null) => {
    letter.position = position;
    letter.node.style.opacity = position ? "1" : "0";
    if (!position) return;
    letter.glyph.textContent = position.character;
    letter.node.style.transform = transform(position.x, position.y);
    letter.node.style.color = position.blue ? BLUE : INK;
  };
  const resolve = (phrase: number) => {
    cancelAnimations();
    resetPointer();
    index = phrase;
    destination = null;
    letters.forEach((letter, i) => place(letter, layouts[index][i] ?? null));
    stage.dataset.phrase = PHRASES[index];
    stage.dataset.phase = "holding";
    remaining = HOLD;
  };

  function sync() {
    if (disposed) return;
    if (suspended()) {
      stopTimer();
      animations.forEach((animation) => animation.pause());
      return;
    }
    if (destination !== null) {
      animations.forEach((animation) => animation.play());
    } else if (!hovering && timer === undefined) {
      started = performance.now();
      timer = setTimeout(() => {
        timer = undefined;
        transition();
      }, remaining);
    } else if (hovering) stopTimer();
  }

  function transition() {
    if (disposed || suspended()) return;
    resetPointer();
    destination = (index + 1) % PHRASES.length;
    stage.dataset.phase = "transitioning";
    const targets = layouts[destination];
    const active = letters.filter((letter) => letter.position);
    const unused = letters.filter((letter) => !letter.position);
    const assigned = new Map<Letter, Position>();
    // Match the nearest identical characters before allocating any new glyphs.
    const pairs = active
      .flatMap((letter) =>
        targets
          .filter((target) => target.character === letter.position!.character)
          .map((target) => ({
            letter,
            target,
            distance: Math.hypot(
              target.x - letter.position!.x,
              target.y - letter.position!.y,
            ),
          })),
      )
      .sort((a, b) => a.distance - b.distance);
    const taken = new Set<Position>();
    pairs.forEach(({ letter, target }) => {
      if (!assigned.has(letter) && !taken.has(target)) {
        assigned.set(letter, target);
        taken.add(target);
      }
    });
    targets.forEach((target) => {
      if (!taken.has(target)) assigned.set(unused.shift()!, target);
    });
    const currentGeneration = ++generation;
    const scatter = mobile ? 20 : 40;
    const animated = new Set([...active, ...assigned.keys()]);
    animated.forEach((letter) => {
      const from = letter.position;
      const to = assigned.get(letter);
      const slot = letters.indexOf(letter);
      const direction = slot % 2 ? 1 : -1;
      const dx = direction * scatter * (0.55 + (slot % 3) * 0.15);
      const dy = ((slot % 3) - 1) * scatter * 0.65;
      const rotation = direction * (mobile ? 5 : 8);
      let frames: Keyframe[];
      if (from && to) {
        // Sample a shallow curve; one timing function keeps velocity continuous.
        frames = Array.from({ length: 21 }, (_, step) => {
          const progress = step / 20;
          const arc = Math.sin(progress * Math.PI);
          return {
            transform: transform(
              from.x + (to.x - from.x) * progress + dx * arc,
              from.y + (to.y - from.y) * progress + dy * arc,
              rotation * arc,
            ),
            opacity: 1,
            offset: progress,
            ...(step === 0 ? { color: from.blue ? BLUE : INK } : {}),
            ...(step === 20 ? { color: to.blue ? BLUE : INK } : {}),
          };
        });
      } else if (from) {
        frames = [
          {
            transform: transform(from.x, from.y),
            opacity: 1,
            color: from.blue ? BLUE : INK,
          },
          {
            transform: transform(from.x + dx, from.y + dy, rotation),
            opacity: 0,
            offset: 0.45,
          },
          {
            transform: transform(from.x + dx, from.y + dy, rotation),
            opacity: 0,
          },
        ];
      } else {
        letter.glyph.textContent = to!.character;
        letter.node.style.color = to!.blue ? BLUE : INK;
        frames = [
          {
            transform: transform(to!.x - dx, to!.y - dy, -rotation),
            opacity: 0,
          },
          {
            transform: transform(to!.x - dx, to!.y - dy, -rotation),
            opacity: 0,
            offset: 0.35,
          },
          { transform: transform(to!.x, to!.y), opacity: 1 },
        ];
      }
      animations.push(
        letter.node.animate(frames, {
          duration: DURATION,
          easing: "cubic-bezier(.45,0,.2,1)",
          fill: "both",
        }),
      );
    });
    Promise.all(animations.map((animation) => animation.finished))
      .then(() => {
        if (disposed || generation !== currentGeneration) return;
        index = destination!;
        destination = null;
        // Commit the same nodes to preserve each matched letter's identity.
        letters.forEach((letter) =>
          place(letter, assigned.get(letter) ?? null),
        );
        cancelAnimations();
        stage.dataset.phrase = PHRASES[index];
        stage.dataset.phase = "holding";
        remaining = HOLD;
        sync();
      })
      .catch(() => {
        /* Resize, reduced motion, and unmount cancel active animations. */
      });
  }

  function measure() {
    if (disposed || !ready) return;
    stopTimer();
    bounds = stage.getBoundingClientRect();
    mobile = window.innerWidth < 900;
    const sample = document.createElement("span");
    sample.className = "letter-measure";
    sample.style.fontSize = "100px";
    stage.append(sample);
    const widths = new Map<string, number>();
    [...new Set(PHRASES.join("").replaceAll(" ", ""))].forEach((character) => {
      sample.textContent = character;
      widths.set(character, sample.getBoundingClientRect().width);
    });
    sample.remove();
    const maxWidth = Math.max(
      ...PHRASES.flatMap((phrase) =>
        phrase
          .split(" ")
          .map((line) =>
            [...line].reduce(
              (sum, character) => sum + widths.get(character)!,
              0,
            ),
          ),
      ),
    );
    fontSize = Math.min(
      mobile ? 64 : 78,
      ((bounds.width - (mobile ? 48 : 88)) / maxWidth) * 100,
    );
    stage.style.setProperty("--letter-size", `${fontSize}px`);
    layouts = PHRASES.map((phrase) => {
      const lines = phrase.split(" ");
      const positions: Position[] = [];
      lines.forEach((line, row) => {
        const width = [...line].reduce(
          (sum, c) => sum + (widths.get(c)! * fontSize) / 100,
          0,
        );
        let x = (bounds.width - width) / 2;
        [...line].forEach((character) => {
          const glyphWidth = (widths.get(character)! * fontSize) / 100;
          positions.push({
            character,
            x,
            y:
              (bounds.height - lines.length * fontSize * 1.12) / 2 +
              row * fontSize * 1.12,
            width: glyphWidth,
            blue: positions.length === 0,
          });
          x += glyphWidth;
        });
      });
      return positions;
    });
    resolve(reduced.matches ? 0 : (destination ?? index));
    stage.dataset.ready = String(!reduced.matches);
    onAvailable(!reduced.matches);
    sync();
  }

  const resize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  };
  const enter = (event: PointerEvent) => {
    if (
      !fine.matches ||
      event.pointerType === "touch" ||
      reduced.matches ||
      paused
    )
      return;
    bounds = stage.getBoundingClientRect();
    hovering = true;
    sync();
  };
  const leave = () => {
    hovering = false;
    resetPointer();
    stopTimer();
    remaining = HOLD;
    sync();
  };
  const move = (event: PointerEvent) => {
    if (!hovering || suspended() || destination !== null || !fine.matches)
      return;
    cancelAnimationFrame(pointerFrame);
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    pointerFrame = requestAnimationFrame(() => {
      letters.forEach(({ position, glyph }) => {
        if (!position) return;
        const dx = position.x + position.width / 2 - x;
        const dy = position.y + fontSize / 2 - y;
        const distance = Math.hypot(dx, dy);
        const strength = Math.max(0, 1 - distance / 130);
        glyph.style.transform = transform(
          (dx / Math.max(1, distance)) * strength * 8,
          (dy / Math.max(1, distance)) * strength * 8,
          strength * 3 * Math.sign(dx),
        );
      });
    });
  };
  const motionChange = () => {
    hovering = false;
    resetPointer();
    measure();
  };
  const visibilityChange = () => {
    resetPointer();
    sync();
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  const resizeObserver = new ResizeObserver(resize);
  observer.observe(stage);
  resizeObserver.observe(stage);
  stage.addEventListener("pointerenter", enter);
  stage.addEventListener("pointerleave", leave);
  stage.addEventListener("pointermove", move);
  reduced.addEventListener("change", motionChange);
  fine.addEventListener("change", leave);
  document.addEventListener("visibilitychange", visibilityChange);
  document.fonts.ready.then(() => {
    if (disposed) return;
    ready = true;
    measure();
  });

  return {
    setPaused(value) {
      paused = value;
      resetPointer();
      sync();
    },
    dispose() {
      disposed = true;
      stopTimer();
      cancelAnimations();
      cancelAnimationFrame(pointerFrame);
      cancelAnimationFrame(resizeFrame);
      observer.disconnect();
      resizeObserver.disconnect();
      stage.removeEventListener("pointerenter", enter);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("pointermove", move);
      reduced.removeEventListener("change", motionChange);
      fine.removeEventListener("change", leave);
      document.removeEventListener("visibilitychange", visibilityChange);
      delete stage.dataset.ready;
      pool.replaceChildren();
    },
  };
}
