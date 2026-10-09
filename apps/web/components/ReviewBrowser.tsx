"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Star } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PublicReview } from "@promdevs/contracts";
import { createReviewRotation } from "@/lib/review-controller";

export function ReviewBrowser({ reviews }: { reviews: PublicReview[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (root.current) return createReviewRotation(root.current);
  }, [reviews]);

  return (
    <div
      ref={root}
      className="review-browser"
      role="region"
      aria-label="Client reviews"
      aria-describedby="review-reading-hint"
      tabIndex={0}
    >
      <p id="review-reading-hint" className="sr-only">
        {reviews.length > 1
          ? "Reviews change automatically. Focus this area to pause and read, or use the previous and next buttons."
          : "Client feedback."}
      </p>
      <div className="review-quotes">
        {reviews.map((review, i) => (
          <figure
            key={review.id}
            className="client-quote"
            data-active={i === 0 ? "true" : "false"}
          >
            <div className="quote-topline">
              <span className="quote-glyph" aria-hidden="true">
                “
              </span>
              {review.rating !== null && (
                <span className="quote-rating">
                  <Star size={13} fill="currentColor" aria-hidden="true" />
                  <span>
                    {review.rating}
                    <span className="sr-only"> out of 5</span>
                  </span>
                </span>
              )}
            </div>
            {review.title && <p className="quote-title">{review.title}</p>}
            <blockquote>
              <p>{review.body}</p>
            </blockquote>
            <figcaption className="quote-attribution">
              {review.author?.avatar && (
                <Image
                  src={review.author.avatar}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="quote-avatar"
                />
              )}
              <div>
                <p className="quote-author">
                  {review.author?.name || "Anonymous client"}
                </p>
                {review.author?.company && (
                  <p className="quote-company">{review.author.company}</p>
                )}
                {review.author?.role && (
                  <p className="quote-role">{review.author.role}</p>
                )}
              </div>
            </figcaption>
            {review.sourceUrl && (
              <a
                href={review.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="quote-source text-link"
              >
                View original review
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            )}
          </figure>
        ))}
      </div>
      {reviews.length > 1 && (
        <div className="review-navigation">
          <div className="review-timing">
            <span className="review-timing-label">Next review</span>
            <div className="review-progress" aria-hidden="true">
              <span className="review-progress-fill" />
            </div>
          </div>
          <div className="review-arrows">
            <button
              type="button"
              data-review-direction="-1"
              aria-label="Previous review"
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              data-review-direction="1"
              aria-label="Next review"
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <p
        className="sr-only review-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />
    </div>
  );
}
