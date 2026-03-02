import { Header } from "@/components/Header";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { Hero } from "@/components/sections/Hero";
import { Services } from "@/components/sections/Services";
import { Github, Linkedin, X, Discord, Youtube } from "@/components/icons";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="ambient-orb absolute -left-24 top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl dark:bg-accent/20" />
        <div className="ambient-orb absolute -right-24 top-112 h-80 w-80 rounded-full bg-black/10 blur-3xl dark:bg-white/10" />
      </div>
      <Header />
      <main id="home" className="relative z-10">
        <Hero />
        <Services />
        <About />
        <Contact />
      </main>
      <footer className="border-t border-neutral-200 py-10 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
          <div className="flex gap-5 text-sm text-neutral-600 dark:text-neutral-300">
            <a
              href="https://x.com/promdevs"
              aria-label="X"
              className="transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
            >
              <X className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/promdevs"
              aria-label="GitHub"
              className="transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://www.linkedin.com/company/promdevs"
              aria-label="LinkedIn"
              className="transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            {/* <a
              href="#"
              aria-label="Discord"
              className="transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
            >
              <Discord className="h-4 w-4" />
            </a> */}
            <a
              href="https://www.youtube.com/@PromDevs"
              aria-label="YouTube"
              className="transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black"
            >
              <Youtube className="h-4 w-4" />
            </a>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} PromDevs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
