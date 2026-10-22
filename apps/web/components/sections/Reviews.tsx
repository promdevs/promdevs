import { getSelectedReviews } from "@/lib/api";
import { getWorkCountries } from "@/data/countries";
import { MotionReveal } from "@/components/MotionReveal";
import { ReviewBrowser } from "@/components/ReviewBrowser";
import { ClientGlobe } from "@/components/globe/ClientGlobe";
import styles from "./Reviews.module.css";

export async function Reviews() {
  const reviews = await getSelectedReviews();
  if (!reviews.length) return null;
  const countries = getWorkCountries();
  return (
    <section
      id="reviews"
      className={`client-stories ${styles.section}`}
      aria-labelledby="reviews-title"
    >
      <div className={`shell ${styles.inner}`}>
        <MotionReveal className="stories-intro">
          <p className="eyebrow">Client stories</p>
          <h2 id="reviews-title" className="section-heading">
            What our clients say.
          </h2>
        </MotionReveal>
        <div className="stories-layout">
          <MotionReveal className="stories-globe">
            <p className="globe-reach">
              <strong>100+ projects</strong> across{" "}
              <strong>{countries.length} countries &amp; territories.</strong>
            </p>
            <ClientGlobe countries={countries} appearance="auto" />
          </MotionReveal>
          <MotionReveal className="stories-reviews" delayMs={100}>
            <ReviewBrowser reviews={reviews} />
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
