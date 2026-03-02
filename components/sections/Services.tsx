import { MotionReveal } from "@/components/MotionReveal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = ["Web Apps", "API Integration", "UI/UX & Performance"];

export function Services() {
  return (
    <section id="services" className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <MotionReveal className="mb-8 flex items-end justify-between">
        <h2 className="text-3xl font-semibold tracking-tight">Services</h2>
      </MotionReveal>
      <div className="grid gap-5 md:grid-cols-3">
        {services.map((service, index) => (
          <MotionReveal
            key={service}
            delayMs={index * 110}
          >
            <Card className="transition hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{service}</CardTitle>
              </CardHeader>
              <CardContent>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                Practical delivery from architecture to launch with a focus on
                maintainability and measurable outcomes.
              </p>
              </CardContent>
            </Card>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}
