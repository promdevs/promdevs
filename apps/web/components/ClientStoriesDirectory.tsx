import Link from "next/link";
import { ArrowUpRight, Quote, Star, UserRound } from "lucide-react";
import type { PublicReview } from "@promdevs/contracts";
import { ActionLink } from "./Action";
import { MotionReveal } from "./MotionReveal";
import { ProjectImage } from "./ProjectImage";
import { breadcrumbData } from "../lib/project-catalog";
import { site } from "../lib/site";

function originalReviewUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function ClientQuote({
  review,
  lead,
}: {
  review: PublicReview;
  lead: boolean;
}) {
  const source = originalReviewUrl(review.sourceUrl);
  return (
    <MotionReveal className={lead ? "voices-item voices-lead" : "voices-item"}>
      <figure className="voices-quote">
        <div className="voices-quote-top">
          <Quote size={lead ? 34 : 26} strokeWidth={1.5} aria-hidden="true" />
          {review.rating !== null && (
            <span className="voices-rating">
              <Star size={14} fill="currentColor" aria-hidden="true" />
              <span>
                {review.rating}
                <span className="sr-only"> out of 5</span>
              </span>
            </span>
          )}
        </div>
        {review.title && (
          <h2 className="voices-review-title">{review.title}</h2>
        )}
        <blockquote>
          <p>{review.body}</p>
        </blockquote>
        <figcaption>
          <div className="voices-author">
            <span className="voices-avatar" aria-hidden="true">
              {review.author?.avatar ? (
                <ProjectImage src={review.author.avatar} alt="" sizes="48px" />
              ) : (
                <UserRound size={20} strokeWidth={1.5} />
              )}
            </span>
            <div>
              <p className="voices-name">
                {review.author?.name || "Anonymous client"}
              </p>
              {review.author?.company && (
                <p className="voices-company">{review.author.company}</p>
              )}
              {review.author?.role && (
                <p className="voices-role">{review.author.role}</p>
              )}
            </div>
          </div>
          {(review.projectSlug || source) && (
            <div className="voices-links">
              {review.projectSlug && (
                <Link
                  href={`/projects/${encodeURIComponent(review.projectSlug)}`}
                  prefetch={false}
                >
                  View project <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              )}
              {source && (
                <a href={source} target="_blank" rel="noopener noreferrer">
                  Original review <ArrowUpRight size={14} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}
        </figcaption>
      </figure>
    </MotionReveal>
  );
}

export function ClientStoriesDirectory({
  reviews,
}: {
  reviews: PublicReview[];
}) {
  return (
    <main id="main-content" className="shell voices-page">
      <MotionReveal entrance className="voices-intro">
        <p className="eyebrow">Client stories</p>
        <h1>In our clients’ words.</h1>
        <p>
          What it’s like to build, improve, and launch a product with PromDevs.
        </p>
      </MotionReveal>
      {reviews.length ? (
        <section className="voices-collection" aria-label="Client reviews">
          {reviews.map((review, index) => (
            <ClientQuote key={review.id} review={review} lead={index === 0} />
          ))}
        </section>
      ) : (
        <div className="voices-empty">
          <h2>Client stories are on their way.</h2>
          <p>In the meantime, take a closer look at our work.</p>
          <ActionLink
            href="/projects"
            label="View our work"
            variant="secondary"
          />
        </div>
      )}
      <MotionReveal className="voices-end">
        <p className="eyebrow">Let’s work together</p>
        <h2>Your project. Our next conversation.</h2>
        <p>
          A new idea or something already in motion. Tell us where you want to
          take it.
        </p>
        <div className="voices-actions">
          <ActionLink href="/?view=html#contact" label="Start a conversation" />
          <ActionLink
            href="/projects"
            label="View our work"
            variant="secondary"
          />
        </div>
      </MotionReveal>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbData(site.url, [
            { name: "Home", path: "/" },
            { name: "Client stories", path: "/client-stories" },
          ]),
        }}
      />
    </main>
  );
}
