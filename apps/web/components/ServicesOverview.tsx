import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Compass,
  Layers3,
  PanelsTopLeft,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { ActionLink } from "./Action";
import { MotionReveal } from "./MotionReveal";
import { serviceAreas, servicesDescription } from "../data/services";
import { expertiseNavigation } from "../data/expertise-navigation";
import { expertisePages } from "../data/expertise";
import { breadcrumbData } from "../lib/project-catalog";
import { site } from "../lib/site";

const serviceIcons = {
  "product-design-engineering": Compass,
  "web-mobile-ai": PanelsTopLeft,
  "prototype-to-production": Layers3,
  "rescue-migrations": Wrench,
  "quality-launch": ShieldCheck,
};

export function ServicesOverview() {
  return (
    <main id="main-content" className="shell offerings-page">
      <section className="offerings-hero" aria-labelledby="offerings-title">
        <MotionReveal entrance>
          <p className="eyebrow">Our services</p>
          <h1 id="offerings-title">
            Great products.
            <br />
            <em>From every angle.</em>
          </h1>
        </MotionReveal>
        <MotionReveal entrance delayMs={110}>
          <p className="offerings-lead">
            Product management, design, and engineering for web, mobile, and AI
            products. Start with an idea, bring us a prototype, or let’s make
            your existing product work better.
          </p>
          <div className="offerings-actions">
            <ActionLink
              href="/?view=html#contact"
              label="Discuss your project"
            />
            <ActionLink
              href="/projects"
              label="See our work"
              variant="secondary"
            />
          </div>
        </MotionReveal>
      </section>

      <div className="offerings-body">
        <aside className="offerings-directory">
          <p className="eyebrow">What we can take on</p>
          <nav aria-label="Explore our services">
            {serviceAreas.map(({ id, name }) => (
              <a key={id} href={`#${id}`}>
                <span>{name}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ))}
          </nav>
          <p className="offerings-directory-note">
            One focused piece of work or the whole product. We shape the scope
            around what you need.
          </p>
        </aside>
        <div className="offerings-capabilities">
          {serviceAreas.map((service, index) => {
            const Icon = serviceIcons[service.id];
            return (
              <section
                key={service.id}
                id={service.id}
                className="offering"
                aria-labelledby={`${service.id}-title`}
              >
                <MotionReveal delayMs={index ? 60 : 0}>
                  <Icon
                    className="offering-icon"
                    size={26}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <h2 id={`${service.id}-title`}>{service.name}</h2>
                  <p className="offering-description">{service.introduction}</p>
                  <div className="offering-detail-grid">
                    <div>
                      <h3>How we help</h3>
                      <ul role="list">
                        {service.scope.map((item) => (
                          <li key={item}>
                            <Check size={14} aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="offering-outputs">
                      <h3>Typical outputs</h3>
                      <ul role="list">
                        {service.outputs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {"note" in service && (
                    <p className="offering-note">{service.note}</p>
                  )}
                  <Link
                    href="/?view=html#contact"
                    className="offerings-text-link"
                    aria-label={`Discuss ${service.name.toLowerCase()}`}
                  >
                    Talk it through{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </MotionReveal>
              </section>
            );
          })}
        </div>
      </div>

      <section
        className="offerings-platforms"
        aria-labelledby="offerings-platforms-title"
      >
        <MotionReveal className="offerings-intro">
          <p className="eyebrow">Platform expertise</p>
          <h2 id="offerings-platforms-title">
            Your tools.
            <br />
            <em>Our expertise.</em>
          </h2>
          <p>
            Already building with an AI platform? We work with the product you
            have, understand its foundations, and help you take it further.
          </p>
        </MotionReveal>
        <div className="offerings-platform-list">
          {expertiseNavigation.map(({ key, name, href, summary }, index) => (
            <MotionReveal key={key} delayMs={index * 90}>
              <Link
                href={href}
                className="offerings-platform-link"
                prefetch={false}
              >
                <span className="offerings-platform-logo">
                  <Image
                    src={expertisePages[key].logo}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                  />
                </span>
                <div className="offerings-platform-copy">
                  <h3>{name}</h3>
                  <span>{summary}</span>
                </div>
                <span className="offerings-platform-credential">
                  {expertisePages[key].certified ? (
                    <>
                      <BadgeCheck size={15} aria-hidden="true" />
                      Certified expert
                    </>
                  ) : (
                    "Specialist support"
                  )}
                </span>
                <ArrowUpRight
                  className="offerings-platform-arrow"
                  size={20}
                  aria-hidden="true"
                />
              </Link>
            </MotionReveal>
          ))}
        </div>
      </section>

      <section
        className="offerings-end"
        aria-labelledby="offerings-contact-title"
      >
        <MotionReveal>
          <p className="eyebrow">Start from here</p>
          <h2 id="offerings-contact-title">
            Bring the idea.
            <br />
            <em>Or the work in progress.</em>
          </h2>
          <p>
            You do not need a finished brief. Tell us what you want to achieve
            and where things stand. We’ll work out the right starting point
            together.
          </p>
          <div className="offerings-actions">
            <ActionLink
              href="/?view=html#contact"
              label="Start a conversation"
            />
            <Link href="/client-stories" className="offerings-text-link">
              Hear from our clients <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </MotionReveal>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": `${site.url}/services#page`,
                url: `${site.url}/services`,
                name: "PromDevs services",
                description: servicesDescription,
                mainEntity: { "@id": `${site.url}/services#capabilities` },
              },
              {
                "@type": "ItemList",
                "@id": `${site.url}/services#capabilities`,
                name: "PromDevs services",
                itemListElement: serviceAreas.map((service, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  item: {
                    "@type": "Service",
                    name: service.name,
                    description: service.introduction,
                    url: `${site.url}/services#${service.id}`,
                    provider: { "@id": `${site.url}/#organization` },
                  },
                })),
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
                  { name: "Services", path: "/services" },
                ]),
              ),
            ],
          }).replaceAll("<", "\\u003c"),
        }}
      />
    </main>
  );
}
