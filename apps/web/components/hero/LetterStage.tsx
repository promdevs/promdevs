"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  createLetterController,
  type LetterController,
} from "./letter-controller";

export function LetterStage() {
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<LetterController | null>(null);
  const [paused, setPaused] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!stage.current) return;
    const instance = createLetterController(stage.current, setAvailable);
    controller.current = instance;
    return () => {
      instance.dispose();
      controller.current = null;
    };
  }, []);

  return (
    <div className="letter-stage" ref={stage}>
      <p className="sr-only">
        Our capabilities: design, build, web apps, mobile apps, AI products, app
        rescue, and ship.
      </p>
      <div className="letter-fallback" aria-hidden="true">
        <span>D</span>
        <span>E</span>
        <span>S</span>
        <span>I</span>
        <span>G</span>
        <span>N</span>
      </div>
      <div className="letter-pool" aria-hidden="true" />
      <button
        type="button"
        className="letter-pause"
        hidden={!available}
        aria-label={
          paused ? "Resume letter animation" : "Pause letter animation"
        }
        onClick={() => {
          const next = !paused;
          controller.current?.setPaused(next);
          setPaused(next);
        }}
      >
        {paused ? (
          <Play size={15} aria-hidden />
        ) : (
          <Pause size={15} aria-hidden />
        )}
      </button>
    </div>
  );
}
