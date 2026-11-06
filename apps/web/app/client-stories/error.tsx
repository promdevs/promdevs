"use client";

import { ActionButton, ActionLink } from "@/components/Action";

export default function ClientStoriesError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main-content" className="shell voices-page">
      <div className="voices-intro">
        <p className="eyebrow">Client stories</p>
        <h1>A brief interruption.</h1>
        <p>
          We couldn’t load our client reviews right now. Please try again in a
          moment.
        </p>
        <div className="voices-actions">
          <ActionButton label="Try again" onClick={retry} />
          <ActionLink
            href="/projects"
            label="View our work"
            variant="secondary"
          />
        </div>
        <noscript>
          <p>Reload this page to try again.</p>
        </noscript>
      </div>
    </main>
  );
}
