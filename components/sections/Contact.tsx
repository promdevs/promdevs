"use client";

import { FormEvent, useState } from "react";
import { MotionReveal } from "@/components/MotionReveal";
import { ActionButton } from "@/components/Action";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Status = "idle" | "success" | "error";

type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  company: string;
};

const initialValues: ContactPayload = {
  name: "",
  email: "",
  subject: "",
  message: "",
  company: "",
};

export function Contact() {
  const [form, setForm] = useState<ContactPayload>(initialValues);
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitting(true);
    setStatus("idle");
    setFeedback("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to send message.");
      }

      setStatus("success");
      setFeedback(body.message ?? "Message sent successfully.");
      setForm(initialValues);
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
      className="shell contact-section"
      aria-labelledby="contact-title"
    >
      <MotionReveal>
        <p className="eyebrow">03 / Start a conversation</p>
        <h2 id="contact-title" className="section-heading">
          Something
          <br />
          on your mind?
        </h2>
        <p className="intro-copy">
          A new idea. A product to improve. A team to build. Tell us what
          you&apos;re thinking, and let&apos;s find a way forward.
        </p>
      </MotionReveal>
      <MotionReveal delayMs={100}>
        <form
          className="contact-form"
          onSubmit={onSubmit}
          aria-busy={submitting}
        >
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
                    setForm((prev) => ({ ...prev, name: event.target.value }))
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
                    setForm((prev) => ({ ...prev, email: event.target.value }))
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
                  setForm((prev) => ({ ...prev, subject: event.target.value }))
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
                  setForm((prev) => ({ ...prev, message: event.target.value }))
                }
              />
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
                  setForm((prev) => ({ ...prev, company: event.target.value }))
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
              (status === "error" ? "text-red-700 dark:text-red-400" : "muted")
            }
          >
            {feedback}
          </p>
        </form>
      </MotionReveal>
    </section>
  );
}
