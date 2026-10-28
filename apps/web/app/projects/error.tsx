"use client";

import Link from "next/link";
import { ActionButton } from "@/components/Action";

export default function ProjectsError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main-content" className="shell portfolio-status">
      <p className="eyebrow">Our work</p>
      <h1>A brief interruption.</h1>
      <p>We couldn’t load this work right now. Please try again in a moment.</p>
      <div className="portfolio-status-actions">
        <ActionButton label="Try again" onClick={retry} />
        <Link href="/projects" className="text-link">
          All projects
        </Link>
        <Link href="/#contact" className="text-link">
          Contact us
        </Link>
      </div>
      <noscript>
        <p>Reload this page to try again.</p>
      </noscript>
    </main>
  );
}
