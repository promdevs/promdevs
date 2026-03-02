"use client";

import { FormEvent, useState } from "react";
import { MotionReveal } from "@/components/MotionReveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  company: ""
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
        body: JSON.stringify(form)
      });

      const body = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to send message.");
      }

      setStatus("success");
      setFeedback(body.message ?? "Message sent successfully.");
      setForm(initialValues);
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "Failed to send message."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <MotionReveal>
        <Card className="p-2 sm:p-4">
          <CardHeader className="pb-2">
          <h2 className="text-3xl font-semibold tracking-tight">Contact Us</h2>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            Share a bit about your project and we&apos;ll follow up shortly.
          </p>
          </CardHeader>
          <CardContent>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                autoComplete="email"
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <Input
              id="subject"
              name="subject"
              required
              value={form.subject}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, subject: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              required
              rows={5}
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, message: event.target.value }))
              }
            />
          </div>

          <div className="hidden" aria-hidden="true">
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

          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send message"}
            </Button>

            {status !== "idle" && (
              <p
                role="status"
                className={`text-sm ${
                  status === "success" ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback}
              </p>
            )}
          </div>
        </form>
          </CardContent>
        </Card>
      </MotionReveal>
    </section>
  );
}
