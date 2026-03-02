import { MotionReveal } from "@/components/MotionReveal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function About() {
  return (
    <section id="about" className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <MotionReveal>
        <Card className="p-2 sm:p-4">
          <CardHeader className="pb-2">
            <h2 className="text-3xl font-semibold tracking-tight">About</h2>
          </CardHeader>
          <CardContent>
          <p className="mt-5 max-w-3xl leading-relaxed text-neutral-700 dark:text-neutral-300">
            PromDevs exists to help product teams launch better software with
            less risk. We partner closely with founders and leaders to deliver
            reliable web products and build trusted engineering momentum.
          </p>
          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <li className="rounded-2xl border border-neutral-200 px-4 py-3 transition hover:border-accent/40 dark:border-white/10 dark:hover:border-accent/60">
              Quality first in architecture and execution
            </li>
            <li className="rounded-2xl border border-neutral-200 px-4 py-3 transition hover:border-accent/40 dark:border-white/10 dark:hover:border-accent/60">
              Speed without cutting critical corners
            </li>
            <li className="rounded-2xl border border-neutral-200 px-4 py-3 transition hover:border-accent/40 dark:border-white/10 dark:hover:border-accent/60">
              Clear communication from kickoff to delivery
            </li>
          </ul>
          </CardContent>
        </Card>
      </MotionReveal>
    </section>
  );
}
