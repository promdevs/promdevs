import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { ProjectsFilter } from "@/components/ProjectsFilter";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Projects — PromDevs",
  description:
    "Browse all products built and shipped by PromDevs across SaaS, AI, fintech, healthtech, and more.",
};

async function getAllProjects() {
  try {
    return await db
      .select()
      .from(projects)
      .orderBy(projects.featured, projects.year);
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const allProjects = await getAllProjects();

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="ambient-orb absolute -left-24 top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl dark:bg-accent/20" />
        <div className="ambient-orb absolute -right-24 top-96 h-80 w-80 rounded-full bg-black/10 blur-3xl dark:bg-white/10" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        {/* Back link */}
        <Link
          href="/#work"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </Link>

        {/* Page header */}
        <div className="mb-12">
          <p className="mb-3 inline-block rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-accent">
            Our Work
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-black dark:text-white sm:text-5xl">
            Products built & shipped.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Every project is a real case study—problem, solution, and measurable results.
          </p>
        </div>

        {/* Filter + grid */}
        <ProjectsFilter projects={allProjects} />
      </main>

      <footer className="border-t border-neutral-200 py-10 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} PromDevs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
