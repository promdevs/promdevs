import { MotionReveal } from "@/components/MotionReveal";

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:pt-24">
      <MotionReveal>
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-soft dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark sm:p-12">
          <MotionReveal delayMs={80}>
            <p className="mb-4 inline-block rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent">
              Coming Soon
            </p>
          </MotionReveal>
          <MotionReveal delayMs={120}>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-black dark:text-white sm:text-5xl">
              PromDevs is launching soon.
            </h1>
          </MotionReveal>
          <MotionReveal delayMs={180}>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700 dark:text-neutral-300">
              We build and ship modern web products and we&apos;re preparing a
              platform to connect teams with proven developers.
            </p>
          </MotionReveal>
          <MotionReveal delayMs={260}>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-2xl border border-accent bg-accent px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
              >
                Contact us
              </a>
              {/* <a
                href="#work"
                className="inline-flex items-center justify-center rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-white/20 dark:bg-black dark:text-white dark:focus-visible:ring-offset-black"
              >
                See our work
              </a> */}
            </div>
          </MotionReveal>
        </div>
      </MotionReveal>
    </section>
  );
}
