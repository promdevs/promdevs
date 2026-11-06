"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  privacyOpenEvent,
  privacyServerSnapshot,
  readPrivacyChoice,
  savePrivacyChoice,
  subscribePrivacy,
} from "../lib/privacy";
import { syncAnalytics, trackPageView } from "../lib/analytics";
import styles from "./PrivacyChoices.module.css";

const subscribeClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const subscribe = (notify: () => void) =>
  subscribePrivacy(() => {
    syncAnalytics();
    notify();
  });

export function PrivacySettingsButton({
  className = "",
}: {
  className?: string;
}) {
  const ready = useSyncExternalStore(
    subscribeClient,
    clientSnapshot,
    serverSnapshot,
  );
  return (
    <span hidden={!ready}>
      <button
        type="button"
        className={className}
        onClick={() => window.dispatchEvent(new Event(privacyOpenEvent))}
      >
        <span>Privacy choices</span>
      </button>
    </span>
  );
}

export function PrivacyChoices() {
  const ready = useSyncExternalStore(
    subscribeClient,
    clientSnapshot,
    serverSnapshot,
  );
  const choice = useSyncExternalStore(
    subscribe,
    readPrivacyChoice,
    privacyServerSnapshot,
  );
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const banner = useRef<HTMLElement>(null);
  const clearance = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const needsChoice = ready && choice === "unknown";
  useEffect(() => {
    const node = banner.current;
    const spacer = clearance.current;
    if (!needsChoice || !node || !spacer) return;
    const measure = () => {
      spacer.style.height = `${Math.ceil(node.getBoundingClientRect().height) + 48}px`;
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [needsChoice, open]);
  useEffect(() => {
    syncAnalytics();
    trackPageView(pathname);
  }, [choice, pathname]);
  useEffect(() => {
    const show = () => {
      dialog.current?.showModal();
      setOpen(true);
    };
    window.addEventListener(privacyOpenEvent, show);
    return () => window.removeEventListener(privacyOpenEvent, show);
  }, []);
  const decide = (analytics: boolean) => {
    const persisted = savePrivacyChoice(analytics ? "granted" : "denied");
    syncAnalytics();
    setNotice(
      persisted
        ? "Your privacy choice has been saved."
        : "Your choice applies to this tab. Your browser could not save it for future visits.",
    );
    dialog.current?.close();
  };
  const actions = (
    <div className={styles.actions}>
      <button type="button" onClick={() => decide(false)}>
        Essential only
      </button>
      <button type="button" onClick={() => decide(true)}>
        Allow analytics
      </button>
    </div>
  );
  return (
    <>
      {needsChoice && !open && (
        <section
          ref={banner}
          className={styles.banner}
          aria-labelledby="privacy-banner-title"
        >
          <h2 id="privacy-banner-title">Your privacy, your choice.</h2>
          <p>
            We use optional analytics to understand visits and enquiries. The
            website works without it.{" "}
            <a href="/privacy-policy#cookies-and-analytics">
              Read our privacy policy.
            </a>
          </p>
          {actions}
        </section>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="privacy-dialog-title"
        aria-describedby="privacy-dialog-description"
        onClose={() => setOpen(false)}
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => dialog.current?.close()}
          aria-label="Close privacy choices"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <h2 id="privacy-dialog-title">Privacy choices.</h2>
        <p id="privacy-dialog-description">
          Choose whether PromDevs can use Google Analytics. You can change your
          mind here at any time.
        </p>
        <div className={styles.category}>
          <h3>
            Essential storage <span>Always on</span>
          </h3>
          <p>
            Your theme and privacy preference. These do not depend on allowing
            analytics.
          </p>
        </div>
        <div className={styles.category}>
          <h3>
            Optional analytics{" "}
            <span>{choice === "granted" ? "On" : "Off"}</span>
          </h3>
          <p>
            Page visits and successful enquiries, without form fields,
            attachments, or booking details in our enquiry events.{" "}
            <a href="/privacy-policy#cookies-and-analytics">Privacy policy</a>
          </p>
        </div>
        {actions}
      </dialog>
      <p className="sr-only" role="status">
        {notice}
      </p>
      {needsChoice && (
        <div ref={clearance} className={styles.clearance} aria-hidden="true" />
      )}
    </>
  );
}
