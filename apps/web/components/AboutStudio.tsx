import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Compass,
  Database,
  Layers3,
  MessagesSquare,
  PanelsTopLeft,
  PenTool,
  Smartphone,
} from "lucide-react";
import { ActionLink } from "./Action";
import { MotionReveal } from "./MotionReveal";
import { breadcrumbData } from "../lib/project-catalog";
import { studioDisciplines, studioFounder } from "../data/studio";
import { site } from "../lib/site";

const principles = [
  {
    title: "Understand before adding.",
    description:
      "Ask the difficult questions early. Understand the people, the product, and the constraints before choosing what to build.",
    icon: Compass,
  },
  {
    title: "Make the details count.",
    description:
      "The interface, the architecture, the loading state, the handover. The parts people notice and the parts they rely on deserve the same care.",
    icon: Layers3,
  },
  {
    title: "Stay in the conversation.",
    description:
      "Explain decisions, make trade-offs visible, and raise concerns early. Collaboration should give you clarity, not another layer to manage.",
    icon: MessagesSquare,
  },
];
const startingPoints = [
  {
    from: "A rough idea",
    to: "A clear product direction",
    note: "Shape the experience, find the essentials, and build the foundations.",
  },
  {
    from: "A promising prototype",
    to: "A production-ready product",
    note: "Connect the pieces, strengthen the engineering, and finish the details.",
  },
  {
    from: "An existing product",
    to: "A better way forward",
    note: "Improve, rescue, rebuild, or migrate. Keep what works. Fix what doesn’t.",
  },
];
const disciplineIcons = {
  "product-management": Compass,
  "product-design": PenTool,
  "frontend-engineering": PanelsTopLeft,
  "backend-engineering": Database,
  "mobile-development": Smartphone,
};

export function AboutStudio() {
  const organizationId = `${site.url}/#organization`;
  const founderId = `${site.url}/about#founder`;
  return (
    <main id="main-content" className="shell studio-about">
      <MotionReveal entrance className="about-intro">
        <p className="eyebrow">About PromDevs</p>
        <h1>
          A product studio.
          <br />
          <em>Built around you.</em>
        </h1>
        <p className="about-intro-copy">
          We’re PromDevs, a digital product studio bringing product management,
          product design, frontend engineering, backend engineering, and mobile
          development together. We build web apps, mobile apps, and AI products,
          and make existing ones better.
        </p>
        <div className="about-actions">
          <ActionLink href="/?view=html#contact" label="Start a conversation" />
          <ActionLink
            href="/projects"
            label="View our work"
            variant="secondary"
          />
        </div>
      </MotionReveal>

      <section className="about-team" aria-labelledby="about-team-heading">
        <MotionReveal className="about-section-intro">
          <p className="eyebrow">The team</p>
          <h2 id="about-team-heading">
            Different disciplines.
            <br />
            <em>One product team.</em>
          </h2>
          <p>
            The right expertise, working together from product direction and
            design to the interfaces and systems underneath.
          </p>
        </MotionReveal>
        <div className="about-team-grid">
          {studioDisciplines.map(({ key, role, description }, index) => {
            const Icon = disciplineIcons[key];
            return (
              <MotionReveal key={key} delayMs={index * 80}>
                <article className="about-team-discipline">
                  <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
                  <h3>{role}</h3>
                  <p>{description}</p>
                </article>
              </MotionReveal>
            );
          })}
        </div>
        <MotionReveal>
          <aside
            className="about-founder"
            aria-labelledby="about-founder-heading"
          >
            <div className="about-founder-photo">
              <Image
                src={studioFounder.portrait}
                alt={`${studioFounder.name}, founder of PromDevs`}
                fill
                sizes="(max-width: 599px) 96px, 120px"
                loading="lazy"
              />
            </div>
            <div className="about-founder-identity">
              <p className="about-founder-role">Our founder</p>
              <h3 id="about-founder-heading">{studioFounder.name}</h3>
              <p className="about-founder-alias">
                @{studioFounder.alias} · {studioFounder.role}, PromDevs
              </p>
            </div>
            <p className="about-founder-description">
              Moses leads the studio, keeping product direction and
              collaboration aligned while our product managers, designers, and
              engineers bring their expertise to the work.
            </p>
          </aside>
        </MotionReveal>
      </section>

      <section
        className="about-starting-points"
        aria-labelledby="about-starting-heading"
      >
        <MotionReveal className="about-section-intro">
          <p className="eyebrow">Different starting points. The same care.</p>
          <h2 id="about-starting-heading">
            You don’t need
            <br />
            <em>a clean slate.</em>
          </h2>
          <p>
            Bring the idea, the prototype, the AI-generated build, or the
            product already in people’s hands. We work from where you are.
          </p>
        </MotionReveal>
        <div className="about-paths">
          {startingPoints.map(({ from, to, note }, index) => (
            <MotionReveal key={from} delayMs={index * 80}>
              <div className="about-path">
                <h3>{from}</h3>
                <span className="about-path-connector" aria-hidden="true">
                  <ArrowRight size={22} strokeWidth={1.5} />
                </span>
                <div className="about-path-destination">
                  <h4>{to}</h4>
                  <p>{note}</p>
                </div>
              </div>
            </MotionReveal>
          ))}
        </div>
        <Link href="/projects" className="about-text-link">
          See it in the work <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="about-tools" aria-labelledby="about-tools-heading">
        <MotionReveal className="about-section-intro">
          <p className="eyebrow">Modern tools. Considered decisions.</p>
          <h2 id="about-tools-heading">
            AI-assisted.
            <br />
            <em>Human-crafted.</em>
          </h2>
          <p>
            We use modern tools to move the work forward, not to skip the
            thinking. AI-assisted builds and custom code both need sound
            architecture, thoughtful design, and someone who knows what to
            question.
          </p>
          <Link href="/?view=html#contact" className="about-text-link">
            Bring us your build <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </MotionReveal>
        <MotionReveal className="about-credentials">
          <p className="about-credential-label">
            <BadgeCheck size={18} aria-hidden="true" /> Certified expertise
          </p>
          <h3>Lovable &amp; Replit expert.</h3>
          <p>
            From a first prototype to a difficult technical problem. We can help
            you understand what you have, improve it, and take it further.
          </p>
          <div className="about-tool-signatures">
            <span>
              <Image
                src="/assets/tools/lovable.svg"
                width={30}
                height={30}
                alt=""
              />
              Lovable
            </span>
            <span>
              <Image
                src="/assets/tools/replit.svg"
                width={30}
                height={30}
                alt=""
              />
              Replit
            </span>
          </div>
        </MotionReveal>
      </section>

      <section
        className="about-principles"
        aria-labelledby="about-principles-heading"
      >
        <MotionReveal className="about-section-intro">
          <p className="eyebrow">The studio standard</p>
          <h2 id="about-principles-heading">Care is in the small things.</h2>
          <p>Not a separate phase. A way of approaching the whole project.</p>
        </MotionReveal>
        <div className="about-principles-grid">
          {principles.map(({ title, description, icon: Icon }, index) => (
            <MotionReveal key={title} delayMs={index * 100}>
              <article className="about-principle">
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            </MotionReveal>
          ))}
        </div>
      </section>

      <MotionReveal className="about-end">
        <p className="eyebrow">Enough about us</p>
        <h2>
          What are
          <br />
          <em>you working on?</em>
        </h2>
        <p>
          A first idea. An unfinished build. A product ready for its next step.
          Let’s talk.
        </p>
        <div className="about-actions">
          <ActionLink href="/?view=html#contact" label="Start a conversation" />
          <ActionLink
            href="/client-stories"
            label="Hear from our clients"
            variant="secondary"
          />
        </div>
      </MotionReveal>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "AboutPage",
                "@id": `${site.url}/about#page`,
                url: `${site.url}/about`,
                name: "About the studio | PromDevs",
                description:
                  "PromDevs is a digital product studio founded by Moses Adebayo, also known as muzardemoses. Its team brings product management, product design, frontend engineering, backend engineering, and mobile development together.",
                about: { "@id": organizationId },
                mainEntity: { "@id": organizationId },
              },
              {
                "@type": "Organization",
                "@id": organizationId,
                name: site.name,
                url: site.url,
                description:
                  "PromDevs brings product managers, product designers, frontend engineers, backend engineers, and mobile developers together to build and improve web, mobile, and AI products.",
                knowsAbout: studioDisciplines.map(
                  ({ discipline }) => discipline,
                ),
                logo: `${site.url}/images/nobg-logo-black.png`,
                founder: { "@id": founderId },
              },
              {
                "@type": "Person",
                "@id": founderId,
                name: studioFounder.name,
                alternateName: studioFounder.alias,
                jobTitle: studioFounder.role,
                image: `${site.url}${studioFounder.portrait}`,
                worksFor: { "@id": organizationId },
              },
              JSON.parse(
                breadcrumbData(site.url, [
                  { name: "Home", path: "/" },
                  { name: "About the studio", path: "/about" },
                ]),
              ),
            ],
          }).replaceAll("<", "\\u003c"),
        }}
      />
    </main>
  );
}
