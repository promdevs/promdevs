import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Code2,
  Plus,
  Rocket,
  Wrench,
} from "lucide-react";
import type { PublicProject, PublicReview } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ActionLink } from "./Action";
import { ProjectCard } from "./ProjectCard";
import { ProjectFeedback } from "./ProjectFeedback";
import { expertiseProcess, type ExpertisePageData } from "../data/expertise";
import { expertiseNavigation } from "../data/expertise-navigation";
import { breadcrumbData } from "../lib/project-catalog";
import { site } from "../lib/site";

const scopeIcons = { build: Code2, improve: Wrench, launch: Rocket };

export function ExpertisePage({
  platform,
  page,
  projects = [],
  reviews = [],
}: {
  platform: string;
  page: ExpertisePageData;
  projects?: PublicProject[];
  reviews?: PublicReview[];
}) {
  return (
    <main
      id="main-content"
      className="shell expertise-page"
      data-platform={platform}
    >
      <section className="expertise-hero" aria-labelledby="expertise-title">
        <MotionReveal entrance className="expertise-platform">
          <span className="expertise-platform-logo">
            <Image src={page.logo} width={48} height={48} alt="" unoptimized />
          </span>
          <p className="eyebrow">{page.name} design &amp; development</p>
        </MotionReveal>
        <MotionReveal entrance delayMs={90}>
          <h1 id="expertise-title">
            {page.headline}
            <br />
            <em>{page.emphasis}</em>
          </h1>
        </MotionReveal>
        <MotionReveal entrance delayMs={180}>
          <p className="expertise-description">{page.introduction}</p>
          <div className="expertise-actions">
            <ActionLink
              href="/?view=html#contact"
              label={`Discuss your ${page.name} project`}
            />
            <ActionLink
              href="#expertise-services"
              label="Explore the services"
              variant="secondary"
            />
          </div>
          <p className="expertise-credential">
            {page.certified ? (
              <>
                <BadgeCheck size={16} aria-hidden="true" />
                Certified {page.name} expert
              </>
            ) : (
              <>Product design. Engineering. Launch.</>
            )}
          </p>
        </MotionReveal>
      </section>

      <nav
        className="expertise-entry"
        aria-label="Your project’s starting point"
      >
        {page.services.map(({ id, label }) => (
          <a key={id} href={`#expertise-${id}`}>
            <span>{label}</span>
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        ))}
      </nav>

      <section
        id="expertise-services"
        className="expertise-section"
        aria-labelledby="expertise-services-title"
      >
        <MotionReveal className="expertise-intro">
          <p className="eyebrow">How we help</p>
          <h2 id="expertise-services-title">{page.serviceHeading}</h2>
          <p>{page.serviceIntro}</p>
        </MotionReveal>
        <div className="expertise-scope-grid">
          {page.services.map(
            ({ id, title, description, deliverables }, index) => {
              const Icon = scopeIcons[id];
              return (
                <MotionReveal key={id} delayMs={index * 100}>
                  <article id={`expertise-${id}`} className="expertise-scope">
                    <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
                    <h3>{title}</h3>
                    <p>{description}</p>
                    <ul role="list">
                      {deliverables.map((text) => (
                        <li key={text}>
                          <Check size={14} aria-hidden="true" />
                          <span>{text}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/?view=html#contact"
                      className="expertise-text-link"
                      aria-label={`Discuss ${title.toLowerCase().replace(/\.$/, "")} for your ${page.name} project`}
                    >
                      Let’s talk <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </article>
                </MotionReveal>
              );
            },
          )}
        </div>
      </section>

      {projects.length > 0 && (
        <section
          className="expertise-section"
          aria-labelledby="expertise-work-title"
        >
          <MotionReveal className="expertise-intro">
            <p className="eyebrow">Selected work</p>
            <h2 id="expertise-work-title">{page.name}, in practice.</h2>
            <p>
              A closer look at published products where {page.name} was part of
              the build.
            </p>
          </MotionReveal>
          <div
            className="catalog-grid expertise-work-grid"
            data-count={Math.min(projects.length, 3)}
          >
            {projects.slice(0, 3).map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                headingAs="h3"
                priority={false}
              />
            ))}
          </div>
          <Link
            href="/projects"
            className="expertise-text-link expertise-work-link"
          >
            View all projects <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}

      <section
        className="expertise-section"
        aria-labelledby="expertise-fit-title"
      >
        <MotionReveal className="expertise-intro">
          <p className="eyebrow">The platform, in perspective</p>
          <h2 id="expertise-fit-title">
            Right platform.
            <br />
            <em>Right reasons.</em>
          </h2>
          <p>{page.fitIntro}</p>
        </MotionReveal>
        <div className="expertise-fit-grid">
          <MotionReveal className="expertise-fit-panel">
            <h3>A good fit when</h3>
            <ul>
              {page.goodFit.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </MotionReveal>
          <MotionReveal className="expertise-fit-panel" delayMs={100}>
            <h3>Worth assessing first</h3>
            <ul>
              {page.assessFirst.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </MotionReveal>
        </div>
        <p className="expertise-platform-note">
          Features and plan limits can change. We scope against your actual
          setup.{" "}
          <a href={page.docs.href} target="_blank" rel="noopener noreferrer">
            {page.docs.title}
            <span className="sr-only"> (opens in a new tab)</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </p>
      </section>

      <section
        className="expertise-section"
        aria-labelledby="expertise-process-title"
      >
        <MotionReveal className="expertise-intro">
          <p className="eyebrow">Working together</p>
          <h2 id="expertise-process-title">A considered route to launch.</h2>
          <p>
            Clear priorities, visible progress, and the right people involved.
            No fixed timeline before we understand the work.
          </p>
        </MotionReveal>
        <div className="expertise-process">
          {expertiseProcess.map(({ title, description, output }, index) => (
            <MotionReveal key={title} delayMs={index * 100}>
              <article className="expertise-process-step">
                <span className="expertise-process-line" aria-hidden="true">
                  <span />
                  <ArrowRight size={17} />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="expertise-process-output">{output}</span>
              </article>
            </MotionReveal>
          ))}
        </div>
      </section>

      {reviews.length > 0 && (
        <div className="expertise-section expertise-feedback">
          <ProjectFeedback reviews={reviews} />
        </div>
      )}

      <section
        className="expertise-section expertise-faqs"
        aria-labelledby="expertise-faq-title"
      >
        <MotionReveal className="expertise-intro">
          <p className="eyebrow">Before we begin</p>
          <h2 id="expertise-faq-title">
            A few questions
            <br />
            <em>about {page.name}.</em>
          </h2>
        </MotionReveal>
        <div className="expertise-faq-list">
          {page.faqs.map(({ question, answer }, index) => (
            <MotionReveal key={question} delayMs={index * 60}>
              <details>
                <summary>
                  <h3>{question}</h3>
                  <Plus size={18} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            </MotionReveal>
          ))}
        </div>
      </section>

      <section
        className="expertise-section expertise-end"
        aria-labelledby="expertise-contact-title"
      >
        <MotionReveal>
          <p className="eyebrow">Your {page.name} project</p>
          <h2 id="expertise-contact-title">
            Let’s make
            <br />
            <em>the next step count.</em>
          </h2>
          <p>
            Tell us what you want to build, what you already have, or what needs
            to work better. We’ll help you find a considered way forward.
          </p>
          <div className="expertise-actions">
            <ActionLink
              href="/?view=html#contact"
              label="Start a conversation"
            />
            <ActionLink
              href="/client-stories"
              label="Hear from our clients"
              variant="secondary"
            />
          </div>
        </MotionReveal>
      </section>
      <nav className="expertise-other" aria-label="More platform expertise">
        <p>Another platform?</p>
        {expertiseNavigation
          .filter(({ key }) => key !== platform)
          .map(({ name, href }) => (
            <Link key={href} href={href} prefetch={false}>
              {name}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ))}
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Service",
                "@id": `${site.url}/expertise/${platform}#service`,
                name: `${page.name} design and development`,
                serviceType: `${page.name} product design, development, improvements and launch support`,
                description: page.description,
                url: `${site.url}/expertise/${platform}`,
                provider: { "@id": `${site.url}/#organization` },
              },
              {
                "@type": "Organization",
                "@id": `${site.url}/#organization`,
                name: site.name,
                legalName: site.legalName,
                url: site.url,
                logo: `${site.url}/images/nobg-logo-black.png`,
              },
              JSON.parse(
                breadcrumbData(site.url, [
                  { name: "Home", path: "/" },
                  {
                    name: `${page.name} expertise`,
                    path: `/expertise/${platform}`,
                  },
                ]),
              ),
            ],
          }).replaceAll("<", "\\u003c"),
        }}
      />
    </main>
  );
}
