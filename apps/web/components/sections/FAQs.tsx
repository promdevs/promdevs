import { Plus } from "lucide-react";
import { MotionReveal } from "@/components/MotionReveal";
import { faqs } from "@/data/faqs";

export function FAQs() {
  return (
    <section
      id="faqs"
      className="shell faq-section"
      aria-labelledby="faqs-title"
    >
      <MotionReveal className="faq-intro">
        <p className="eyebrow">Before we begin</p>
        <h2 id="faqs-title" className="section-heading">
          FAQs.
        </h2>
        <p className="muted">Good to know before we get started.</p>
      </MotionReveal>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <MotionReveal key={faq.question} delayMs={index * 60}>
            <details className="faq-item">
              <summary>
                <h3>{faq.question}</h3>
                <Plus size={18} aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <p>{faq.answer}</p>
              </div>
            </details>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}
