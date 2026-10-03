import { ArrowUpRight } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
const services = [
  {
    name: "Web applications",
    description:
      "From your first product to your next chapter. We build thoughtful, reliable web applications around what your business actually needs.",
    tags: ["Web platforms", "Custom development", "Product engineering"],
  },
  {
    name: "API integration",
    description:
      "Make your systems work together. We connect the tools, payments, and data behind a seamless product experience.",
    tags: ["Connected systems", "Automation", "Backend development"],
  },
  {
    name: "UI/UX & performance",
    description:
      "The details make the difference. Clear interfaces, purposeful interactions, and fast experiences that feel effortless to use.",
    tags: ["Interface design", "User experience", "Performance"],
  },
];
export function Services() {
  return (
    <section
      id="services"
      className="shell services"
      aria-labelledby="services-title"
    >
      <MotionReveal className="section-intro">
        <p className="eyebrow">01 / What we do</p>
        <div>
          <h2 id="services-title" className="section-heading">
            Your ambition.
            <br />
            Our craft.
          </h2>
          <p className="muted">
            Product design and engineering for web apps, mobile apps, and AI
            products. We build from scratch and improve the products you already
            have.
          </p>
        </div>
      </MotionReveal>
      <div>
        {services.map((service, index) => (
          <MotionReveal key={service.name} delayMs={index * 70}>
            <article className="service-row">
              <span className="service-number">0{index + 1}</span>
              <h3>{service.name}</h3>
              <div className="service-description">
                <p>{service.description}</p>
                <div className="service-tags">
                  {service.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
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
