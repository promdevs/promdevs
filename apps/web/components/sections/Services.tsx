import { ArrowUpRight } from "lucide-react";
import { ActionLink } from "@/components/Action";
import { MotionReveal } from "@/components/MotionReveal";

const services = [
  {
    name: "Product design & engineering",
    positioning: "Make the right thing. Build it properly.",
    description:
      "We shape ideas into clear product direction, intuitive UX/UI, and sound technical foundations. From early concepts to complex requirements, design and engineering work together from the start.",
  },
  {
    name: "Web, mobile & AI products",
    positioning: "Built around what people need.",
    description:
      "We develop custom web applications, iOS and Android apps, and AI-powered products, connecting interfaces, APIs, and intelligent workflows into a coherent experience.",
  },
  {
    name: "Prototype to production",
    positioning: "Promising is only the beginning.",
    description:
      "We turn MVPs, prototypes, and AI-generated builds into production-ready products—strengthening architecture, completing features, and building reliable backends and databases.",
  },
  {
    name: "Product rescue & migrations",
    positioning: "Move forward without starting over.",
    description:
      "We take over unfinished or struggling products, solve difficult technical problems, and improve existing experiences. That includes website and app migrations, backend changes, and carefully planned database migrations.",
  },
  {
    name: "Quality & launch",
    positioning: "Ready for the real world.",
    description:
      "QA, testing, accessibility, and performance improvements help polish the experience before release. We handle production deployment and support App Store and Google Play submissions, including preparation and review follow-up.",
  },
];

export function Services() {
  return (
    <section
      id="services"
      className="shell services"
      aria-labelledby="services-title"
    >
      <div className="services-intro">
        <MotionReveal>
          <p className="eyebrow">Our capabilities</p>
          <h2 id="services-title" className="services-title">
            What we do.
          </h2>
          <p className="services-statement">
            <span>Your product.</span>
            <em>At any stage.</em>
          </p>
          <p className="services-copy">
            Bring us a rough idea, a prototype, an unfinished or AI-generated
            build, or a product already in use. We turn starting points into
            polished, production-ready web, mobile, and AI products—and help
            carry them through launch.
          </p>
          <ActionLink href="#contact" label="Let’s build something" />
        </MotionReveal>
      </div>
      <div className="services-list">
        {services.map((service, index) => (
          <MotionReveal key={service.name} delayMs={index * 70}>
            <article className="service-row">
              <div className="service-content">
                <h3>{service.name}</h3>
                <p className="service-positioning">{service.positioning}</p>
                <p className="service-description">{service.description}</p>
              </div>
              <a
                href="#contact"
                className="service-arrow"
                aria-label={"Discuss " + service.name}
              >
                <ArrowUpRight size={20} aria-hidden />
              </a>
            </article>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}
