import { ArrowUpRight, Quote, Star } from "lucide-react";
import type { PublicReview } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ProjectImage } from "./ProjectImage";

export function ProjectFeedback({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;
  return (
    <section className="case-feedback" aria-labelledby="case-feedback-title">
      <h2 id="case-feedback-title">Client feedback.</h2>
      {reviews.map((review) => (
        <MotionReveal key={review.id}>
          <figure className="case-review">
            <div className="case-review-top">
              <Quote size={30} aria-hidden="true" />
              {review.rating !== null && (
                <span className="case-review-rating">
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  {review.rating}
                  <span className="sr-only"> out of 5</span>
                </span>
              )}
            </div>
            {review.title && (
              <p className="case-review-title">{review.title}</p>
            )}
            <blockquote>
              <p>{review.body}</p>
            </blockquote>
            <figcaption>
              <div className="case-review-author">
                {review.author?.avatar && (
                  <span className="case-review-avatar" aria-hidden="true">
                    <ProjectImage
                      src={review.author.avatar}
                      alt=""
                      sizes="48px"
                    />
                  </span>
                )}
                <div>
                  <p className="case-review-name">
                    {review.author?.name || "Anonymous client"}
                  </p>
                  {review.author?.company && (
                    <p className="case-review-company">
                      {review.author.company}
                    </p>
                  )}
                  {review.author?.role && (
                    <p className="case-review-role">{review.author.role}</p>
                  )}
                </div>
              </div>
              {review.sourceUrl && /^https?:\/\//i.test(review.sourceUrl) && (
                <a
                  className="case-review-source"
                  href={review.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original review
                  <ArrowUpRight size={15} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </figcaption>
          </figure>
        </MotionReveal>
      ))}
    </section>
  );
}
