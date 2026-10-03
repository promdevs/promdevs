import { Compass, Layers, MessagesSquare } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
export function About() {
  return (
    <section id="about" className="shell" aria-labelledby="about-title">
      <MotionReveal className="about-panel">
        <div className="about-layout">
          <div>
            <p className="eyebrow">02 / The way we work</p>
            <h2 id="about-title" className="section-heading mt-8">
              Small details.
              <br />
              Big difference.
            </h2>
          </div>
          <div>
            <p className="about-copy">
              Good work starts with people who care about what they&apos;re
              building.
            </p>
            <p className="muted leading-relaxed">
              We&apos;re PromDevs. We partner with founders and product teams to
              turn complex challenges into clear, useful digital experiences.
              Close collaboration, thoughtful decisions, and care from start to
              finish.
            </p>
          </div>
        </div>
        <div className="principles">
          <div>
            <Layers aria-hidden />
            <h3>Built with intention</h3>
            <p>
              Quality in the architecture, the interface, and everything in
              between.
            </p>
          </div>
          <div>
            <Compass aria-hidden />
            <h3>Progress with purpose</h3>
            <p>
              A practical path from idea to launch, without losing sight of the
              details.
            </p>
          </div>
          <div>
            <MessagesSquare aria-hidden />
            <h3>Always in the loop</h3>
            <p>
              Honest conversations, shared decisions, and clear communication.
            </p>
          </div>
        </div>
      </MotionReveal>
    </section>
  );
}
