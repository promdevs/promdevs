"use client";

import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { bookingEventPath, bookingUi } from "@/lib/booking";
import { site } from "@/lib/site";
import styles from "./BookingCalendar.module.css";

type Phase = "loading" | "ready" | "slow" | "error";
const embedScriptUrl = "https://app.cal.com/embed/embed.js";

export default function BookingCalendar() {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const host = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const namespace = `promdevs-discovery-${id}-${attempt}`;

  useEffect(() => {
    let disposed = false;
    let disconnect = () => {};
    const timeout = window.setTimeout(() => {
      if (!disposed)
        setPhase((current) => (current === "loading" ? "slow" : current));
    }, 20000);

    const scriptFailed = (event: Event) => {
      if (
        event.target instanceof HTMLScriptElement &&
        event.target.src === embedScriptUrl
      ) {
        window.clearTimeout(timeout);
        if (!disposed) setPhase("error");
      }
    };
    window.addEventListener("error", scriptFailed, true);
    // The hosted runtime currently applies only iframeAttrs.id, not its title.
    const nameFrame = () => {
      host.current?.querySelectorAll("iframe").forEach((frame) => {
        frame.title = "Book a 30-minute discovery call with PromDevs";
      });
    };
    const frames = new MutationObserver(nameFrame);
    if (host.current)
      frames.observe(host.current, { childList: true, subtree: true });
    nameFrame();

    void getCalApi({ namespace })
      .then((cal) => {
        if (disposed) return;
        const compact = window.matchMedia("(max-width: 639px)");
        const ready = () => {
          window.clearTimeout(timeout);
          if (!disposed) {
            syncTheme();
            setPhase("ready");
          }
        };
        const failed = () => {
          window.clearTimeout(timeout);
          if (!disposed) setPhase("error");
        };
        const syncTheme = () => {
          cal(
            "ui",
            bookingUi(
              document.documentElement.classList.contains("dark")
                ? "dark"
                : "light",
              compact.matches || (host.current?.clientWidth ?? 0) < 900,
            ),
          );
        };
        cal("on", { action: "linkReady", callback: ready });
        cal("on", { action: "linkFailed", callback: failed });
        syncTheme();
        compact.addEventListener("change", syncTheme);
        const size = new ResizeObserver(syncTheme);
        if (host.current) size.observe(host.current);
        const theme = new MutationObserver(syncTheme);
        theme.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
        disconnect = () => {
          theme.disconnect();
          size.disconnect();
          compact.removeEventListener("change", syncTheme);
          cal("off", { action: "linkReady", callback: ready });
          cal("off", { action: "linkFailed", callback: failed });
        };
      })
      .catch(() => {
        if (!disposed) setPhase("error");
      });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.removeEventListener("error", scriptFailed, true);
      frames.disconnect();
      disconnect();
    };
  }, [namespace]);

  const retry = () => {
    setPhase("loading");
    // The SDK keeps its queue after a script failure; retry the loader as well.
    if (!window.Cal?.version) {
      document.querySelector(`script[src="${embedScriptUrl}"]`)?.remove();
      const script = document.createElement("script");
      script.src = embedScriptUrl;
      script.async = true;
      document.head.appendChild(script);
    }
    setAttempt((current) => current + 1);
  };

  return (
    <div className={styles.calendar} data-state={phase}>
      {phase !== "ready" && (
        <div className={styles.feedback} role="status" aria-live="polite">
          {phase === "loading" || phase === "slow" ? (
            <>
              <LoaderCircle
                className={styles.spinner}
                size={20}
                aria-hidden="true"
              />
              <p>
                {phase === "slow"
                  ? "The calendar is taking a little longer to load."
                  : "Finding your next available time..."}
              </p>
            </>
          ) : (
            <p>
              The calendar couldn&apos;t load. You can retry or send us a
              message instead.
            </p>
          )}
          {(phase === "slow" || phase === "error") && (
            <div className={styles.recovery}>
              <button type="button" onClick={retry}>
                <RotateCcw size={15} aria-hidden="true" /> Try again
              </button>
              <a
                href={site.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Cal.com{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          )}
        </div>
      )}
      <div ref={host} className={styles.host}>
        <Cal
          key={namespace}
          namespace={namespace}
          calLink={bookingEventPath(site.bookingUrl)}
          config={{
            layout: "month_view",
            showTimezoneWhenEventDetailsHidden: "true",
            showEventDurationWhenEventDetailsHidden: "true",
            iframeAttrs: {
              title: "Book a 30-minute discovery call with PromDevs",
            },
          }}
          style={{ width: "100%", minHeight: "640px", overflow: "auto" }}
        />
      </div>
    </div>
  );
}
