"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useSyncExternalStore,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { CalendarDays, MessageSquare, Paperclip, X } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
import { ActionButton } from "@/components/Action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { site } from "@/lib/site";
import { contactNotice, type ContactReceipt } from "@/lib/contact-submission";
import {
  attachmentSelectionError,
  encodeContactAttachments,
} from "@/lib/contact-attachments";
import styles from "./Contact.module.css";

const BookingCalendar = dynamic(
  () => import("@/components/booking/BookingCalendar"),
  {
    ssr: false,
    loading: () => (
      <p className={styles.calendarLoading} role="status">
        Loading calendar...
      </p>
    ),
  },
);

type Tab = "message" | "call";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const desktopTabQuery = "(min-width: 900px)";
const desktopTabs = () => window.matchMedia(desktopTabQuery).matches;
const subscribeTabLayout = (notify: () => void) => {
  const query = window.matchMedia(desktopTabQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

type Status = "idle" | "success" | "error";
const initialValues = {
  name: "",
  email: "",
  subject: "",
  message: "",
  company: "",
};

export function Contact({ receipt }: { receipt?: ContactReceipt } = {}) {
  const [form, setForm] = useState(initialValues);
  const [status, setStatus] = useState<Status>(
    () => contactNotice(receipt).status,
  );
  const [feedback, setFeedback] = useState(
    () => contactNotice(receipt).message,
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("message");
  const [calendarLoaded, setCalendarLoaded] = useState(false);
  const enhanced = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const verticalTabs = useSyncExternalStore(
    subscribeTabLayout,
    desktopTabs,
    serverSnapshot,
  );
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "call") setCalendarLoaded(true);
  };
  const tabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const arrows = verticalTabs
      ? ["ArrowUp", "ArrowDown"]
      : ["ArrowLeft", "ArrowRight"];
    if (![...arrows, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    selectTab(next === 0 ? "message" : "call");
    tabs.current[next]?.focus();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    setFeedback("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachments: await encodeContactAttachments(files),
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "Failed to send message.");
      setStatus("success");
      setFeedback(body.message ?? "Message sent successfully.");
      setForm(initialValues);
      setFiles([]);
      setFileError("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Failed to send message.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className={`shell contact-section ${styles.section}`}
      aria-labelledby="contact-title"
    >
      <MotionReveal className={styles.intro}>
        <p className="eyebrow">Start a conversation</p>
        <h2 id="contact-title" className="section-heading">
          Let&apos;s talk about your project.
        </h2>
        <p className="intro-copy">
          A new idea. A product to improve. A team to build. Talk it through on
          a call, or send us a few details.
        </p>
        <noscript>
          <p className={styles.bookingNote}>
            <a href={site.bookingUrl}>Book a 30-minute call on Cal.com</a>
          </p>
        </noscript>
      </MotionReveal>
      <MotionReveal delayMs={100} className={styles.workspace}>
        <div className={styles.switcher} hidden={!enhanced}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label="How would you like to talk?"
            aria-orientation={verticalTabs ? "vertical" : "horizontal"}
            hidden={!enhanced}
          >
            {(["message", "call"] as const).map((tab, index) => (
              <button
                key={tab}
                ref={(node) => {
                  tabs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`contact-tab-${tab}`}
                aria-controls={`contact-panel-${tab}`}
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => selectTab(tab)}
                onKeyDown={(event) => tabKey(event, index)}
              >
                {tab === "message" ? (
                  <MessageSquare size={16} aria-hidden="true" />
                ) : (
                  <CalendarDays size={16} aria-hidden="true" />
                )}
                {tab === "message" ? "Send a message" : "Book a call"}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.panels}>
          <div
            id="contact-panel-message"
            role={enhanced ? "tabpanel" : undefined}
            aria-labelledby={enhanced ? "contact-tab-message" : undefined}
            hidden={activeTab !== "message"}
          >
            <form
              action="/api/contact"
              method="post"
              className="contact-form"
              onSubmit={onSubmit}
              aria-busy={submitting}
              aria-labelledby="contact-form-title"
            >
              <div className={styles.formIntro}>
                <h3 id="contact-form-title">Tell us what you have in mind.</h3>
                <p>A few details are all we need to get started.</p>
              </div>
              <fieldset disabled={submitting}>
                <div className="form-pair">
                  <div className="field">
                    <label htmlFor="name">Your name</label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      placeholder="Alex Morgan"
                      required
                      maxLength={100}
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email address</label>
                    <Input
                      id="email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      placeholder="alex@company.com"
                      required
                      maxLength={320}
                      value={form.email}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="subject">What can we help with?</label>
                  <Input
                    id="subject"
                    name="subject"
                    placeholder="A new product, a fresh perspective..."
                    required
                    maxLength={150}
                    value={form.subject}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        subject: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="message">A little about your project</label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="The idea, the challenge, the possibilities."
                    required
                    rows={3}
                    maxLength={5000}
                    value={form.message}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        message: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className={styles.attachments} hidden={!enhanced}>
                  <div className={styles.attachmentHeading}>
                    <span>
                      Attachments{" "}
                      <span className={styles.optional}>(optional)</span>
                    </span>
                    <button
                      type="button"
                      className={styles.attachButton}
                      onClick={() => fileInput.current?.click()}
                      aria-describedby="contact-file-help"
                    >
                      <Paperclip size={15} aria-hidden="true" /> Add files
                    </button>
                  </div>
                  <input
                    ref={fileInput}
                    id="contact-files"
                    type="file"
                    multiple
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    aria-label="Attach project files"
                    onChange={(event) => {
                      const selected = [
                        ...files,
                        ...Array.from(event.target.files ?? []),
                      ];
                      const error = attachmentSelectionError(selected);
                      setFileError(error ?? "");
                      if (!error) setFiles(selected);
                      event.target.value = "";
                    }}
                  />
                  <p id="contact-file-help" className={styles.fileHelp}>
                    A brief, reference, or screenshot. PDF, PNG, JPG, WebP. Up
                    to 3 files, 3 MB total.
                  </p>
                  {files.length > 0 && (
                    <ul className={styles.fileList}>
                      {files.map((file, index) => (
                        <li key={index}>
                          <span title={file.name}>{file.name}</span>
                          <small>
                            {Math.max(1, Math.round(file.size / 1024))} KB
                          </small>
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => {
                              setFiles((current) =>
                                current.filter((_, item) => item !== index),
                              );
                              setFileError("");
                            }}
                          >
                            <X size={15} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={styles.fileError} role="status">
                    {fileError}
                  </p>
                </div>
                <div hidden aria-hidden="true">
                  <label htmlFor="company">Company</label>
                  <input
                    id="company"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        company: event.target.value,
                      }))
                    }
                  />
                </div>
                <ActionButton
                  type="submit"
                  disabled={submitting}
                  className="submit-button"
                  label={submitting ? "Sending..." : "Send your message"}
                  loading={submitting}
                />
              </fieldset>
              <p
                role="status"
                aria-live="polite"
                className={
                  "form-feedback " +
                  (status === "error"
                    ? "text-red-700 dark:text-red-400"
                    : "muted")
                }
              >
                {feedback}
              </p>
            </form>
          </div>
          <div
            id="contact-panel-call"
            role="tabpanel"
            aria-labelledby="contact-tab-call"
            hidden={activeTab !== "call"}
          >
            <div className={styles.formIntro}>
              <h3>Find a time to talk.</h3>
              <p>A 30-minute discovery call. Pick a time that works for you.</p>
            </div>
            {calendarLoaded && <BookingCalendar />}
          </div>
        </div>
      </MotionReveal>
    </section>
  );
}
