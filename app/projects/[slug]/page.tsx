import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ChevronLeft, ExternalLink, Github, ArrowRight } from "lucide-react";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

const categoryConfig: Record<string, { gradient: string; badge: string; dot: string }> = {
  SaaS: { gradient: "from-blue-500/20 via-blue-400/10 to-transparent", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  AI: { gradient: "from-purple-500/20 via-purple-400/10 to-transparent", badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", dot: "bg-purple-500" },
  Fintech: { gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", dot: "bg-emerald-500" },
  Healthtech: { gradient: "from-teal-500/20 via-teal-400/10 to-transparent", badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20", dot: "bg-teal-500" },
  Edtech: { gradient: "from-orange-500/20 via-orange-400/10 to-transparent", badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", dot: "bg-orange-500" },
  Marketplace: { gradient: "from-indigo-500/20 via-indigo-400/10 to-transparent", badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", dot: "bg-indigo-500" },
  "Developer Tools": { gradient: "from-slate-500/20 via-slate-400/10 to-transparent", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", dot: "bg-slate-500" },
  "Booking Platform": { gradient: "from-rose-500/20 via-rose-400/10 to-transparent", badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", dot: "bg-rose-500" },
  Dashboard: { gradient: "from-cyan-500/20 via-cyan-400/10 to-transparent", badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", dot: "bg-cyan-500" },
  "E-commerce": { gradient: "from-amber-500/20 via-amber-400/10 to-transparent", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
};
const fallbackConfig = { gradient: "from-neutral-500/20 via-neutral-400/10 to-transparent", badge: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20", dot: "bg-neutral-500" };

async function getProject(slug: string) {
  try {
    const rows = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project Not Found — PromDevs" };
  return {
    title: `${project.title} — PromDevs`,
    description: project.description,
  };
}

export async function generateStaticParams() {
  try {
    const rows = await db.select({ slug: projects.slug }).from(projects);
    return rows.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const config = categoryConfig[project.category] ?? fallbackConfig;

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0">
        <div className="ambient-orb absolute -left-24 top-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl dark:bg-accent/20" />
      </div>

      <Header />

      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16 sm:py-20">
        {/* Back */}
        <Link
          href="/projects"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-accent dark:text-neutral-400"
        >
          <ChevronLeft className="h-4 w-4" />
          All projects
        </Link>

        {/* Hero card */}
        <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark">
          {/* Gradient header */}
          <div className={cn("flex h-48 items-center justify-center bg-gradient-to-br sm:h-56", config.gradient)}>
            <span className="font-museo-moderno text-6xl font-bold tracking-tight text-neutral-900/10 select-none dark:text-white/10 sm:text-7xl">
              {project.title.split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>

          <div className="p-8 sm:p-10">
            {/* Category + year + status */}
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", config.badge)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                {project.category}
              </span>
              <span className="rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400">
                {project.year}
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-600 dark:text-emerald-400">
                {project.status}
              </span>
              {project.featured && (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                  Featured
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
              {project.title}
            </h1>

            {/* Description */}
            <p className="mt-4 text-base leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-lg">
              {project.description}
            </p>

            {/* Links */}
            {(project.liveUrl || project.githubUrl) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-accent bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View live site
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent dark:border-white/20 dark:bg-black dark:text-white"
                  >
                    <Github className="h-4 w-4" />
                    View source
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mt-8 rounded-3xl border border-neutral-200 bg-white p-8 shadow-soft dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark sm:p-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
            Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-xl border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:border-white/10 dark:text-neutral-300"
              >
                {tech}
              </span>
            ))}
          </div>
          {project.tags && project.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-dashed border-neutral-200 px-3 py-1 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Case study sections */}
        {(project.problem || project.solution || project.results) && (
          <div className="mt-8 grid gap-6 sm:grid-cols-1">
            {project.problem && (
              <CaseStudyBlock
                label="The Problem"
                accentClass="text-rose-600 dark:text-rose-400"
                borderClass="border-rose-500/20"
                bgClass="bg-rose-500/5"
                content={project.problem}
              />
            )}
            {project.solution && (
              <CaseStudyBlock
                label="The Solution"
                accentClass="text-accent dark:text-blue-400"
                borderClass="border-accent/20"
                bgClass="bg-accent/5"
                content={project.solution}
              />
            )}
            {project.results && (
              <CaseStudyBlock
                label="The Results"
                accentClass="text-emerald-600 dark:text-emerald-400"
                borderClass="border-emerald-500/20"
                bgClass="bg-emerald-500/5"
                content={project.results}
              />
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark sm:p-10">
          <p className="text-lg font-semibold tracking-tight text-black dark:text-white">
            Want to build something like this?
          </p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            We partner with founders and teams to design, build, and ship products that matter.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 rounded-2xl border border-accent bg-accent px-6 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Start a conversation
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:border-accent hover:text-accent dark:border-white/20 dark:bg-black dark:text-white"
            >
              View all projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-10 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-center px-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} PromDevs. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function CaseStudyBlock({
  label,
  accentClass,
  borderClass,
  bgClass,
  content,
}: {
  label: string;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  content: string;
}) {
  return (
    <div className={cn("rounded-3xl border p-8 sm:p-10", borderClass, bgClass)}>
      <h2 className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.12em]", accentClass)}>
        {label}
      </h2>
      <p className="text-base leading-relaxed text-neutral-700 dark:text-neutral-300">
        {content}
      </p>
    </div>
  );
}
