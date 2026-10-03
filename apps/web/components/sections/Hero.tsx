import { ActionLink } from "@/components/Action";
import { MotionReveal } from "@/components/MotionReveal";
import { Star } from "lucide-react";

export function Hero() {
  return (
    <section className="hero studio-hero" aria-labelledby="hero-title">
      <div className="shell studio-hero-content">
        <MotionReveal entrance className="hero-proof-line">
          <p className="eyebrow">Digital product studio</p>
          <p className="hero-rating">
            <span className="sr-only">
              Rated 4.99 out of 5, based on 100+ ratings.
            </span>
            <span className="hero-rating-content" aria-hidden="true">
              <span className="hero-rating-stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={11}
                    fill="currentColor"
                    strokeWidth={0}
                  />
                ))}
              </span>
              <span className="hero-rating-score">
                4.99<span>/5</span>
              </span>
              <span className="hero-rating-count">100+ ratings</span>
            </span>
          </p>
        </MotionReveal>
        <h1 id="hero-title">
          <MotionReveal as="span" entrance delayMs={90}>
            Your next big idea.
          </MotionReveal>{" "}
          <MotionReveal as="span" entrance delayMs={180}>
            <em>Beautifully built.</em>
          </MotionReveal>
        </h1>
        <MotionReveal entrance delayMs={270}>
          <p className="hero-description">
            PromDevs designs and builds web apps, mobile apps, and AI products
            for founders and brands. Starting fresh or improving an existing
            product, we help you move from idea to launch.
          </p>
        </MotionReveal>
        <MotionReveal entrance delayMs={360} className="hero-actions">
          <ActionLink href="#contact" label="Start a project" />
          <ActionLink
            href="/projects"
            label="View our work"
            variant="secondary"
          />
        </MotionReveal>
      </div>
    </section>
  );
}
