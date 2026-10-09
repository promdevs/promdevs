import { getSelectedReviews } from "@/lib/api";
import { getWorkCountries } from "@/data/countries";
import { MotionReveal } from "@/components/MotionReveal";
import { ReviewBrowser } from "@/components/ReviewBrowser";
import { ClientGlobe } from "@/components/globe/ClientGlobe";

export async function Reviews() {
  const reviews = await getSelectedReviews();
  if (!reviews.length) return null;
  const countries = getWorkCountries();
  return (
    <section
      id="reviews"
      className="shell client-stories"
      aria-labelledby="reviews-title"
    >
      <MotionReveal className="stories-intro">
        <p className="eyebrow">Client stories</p>
        <h2 id="reviews-title" className="section-heading">
          What our clients say.
        </h2>
      </MotionReveal>
      <div className="stories-layout">
        <MotionReveal className="stories-globe">
          <p className="globe-reach">
            <strong>100+ projects</strong> across <strong>7 countries.</strong>
          </p>
          <ClientGlobe countries={countries} />
        </MotionReveal>
        <MotionReveal className="stories-reviews" delayMs={100}>
          <ReviewBrowser reviews={reviews} />
        </MotionReveal>
      </div>
    </section>
  );
}
