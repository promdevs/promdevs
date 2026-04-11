import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { ProjectCard } from "@/components/ProjectCard";
import { MotionReveal } from "@/components/MotionReveal";

async function getFeaturedProjects() {
  try {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.featured, true))
      .limit(3);
  } catch {
    return [];
  }
}

export async function Projects() {
  const featured = await getFeaturedProjects();

  if (featured.length === 0) return null;

  return (
    <section id="work" className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <MotionReveal className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Featured Work</h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            A selection of products we&apos;ve designed, built, and shipped.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5"
        >
          All projects
          <ArrowRight className="h-4 w-4" />
        </Link>
      </MotionReveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((project, index) => (
          <MotionReveal key={project.id} delayMs={index * 100}>
            <ProjectCard project={project} />
          </MotionReveal>
        ))}
      </div>

      <MotionReveal delayMs={300} className="mt-10 flex justify-center">
        <Link
          href="/projects"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:border-white/20 dark:bg-black dark:text-white dark:focus-visible:ring-offset-black"
        >
          View all 12 projects
          <ArrowRight className="h-4 w-4" />
        </Link>
      </MotionReveal>
    </section>
  );
}
