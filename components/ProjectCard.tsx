import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { type Project } from "@/db/schema";
import { cn } from "@/lib/utils";

const categoryConfig: Record<
  string,
  { gradient: string; badge: string; dot: string }
> = {
  SaaS: {
    gradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  AI: {
    gradient: "from-purple-500/20 via-purple-400/10 to-transparent",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  Fintech: {
    gradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  Healthtech: {
    gradient: "from-teal-500/20 via-teal-400/10 to-transparent",
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    dot: "bg-teal-500",
  },
  Edtech: {
    gradient: "from-orange-500/20 via-orange-400/10 to-transparent",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  Marketplace: {
    gradient: "from-indigo-500/20 via-indigo-400/10 to-transparent",
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    dot: "bg-indigo-500",
  },
  "Developer Tools": {
    gradient: "from-slate-500/20 via-slate-400/10 to-transparent",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    dot: "bg-slate-500",
  },
  "Booking Platform": {
    gradient: "from-rose-500/20 via-rose-400/10 to-transparent",
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500",
  },
  Dashboard: {
    gradient: "from-cyan-500/20 via-cyan-400/10 to-transparent",
    badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    dot: "bg-cyan-500",
  },
  "E-commerce": {
    gradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
};

const fallbackConfig = {
  gradient: "from-neutral-500/20 via-neutral-400/10 to-transparent",
  badge: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
  dot: "bg-neutral-500",
};

function getInitials(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ProjectCardProps {
  project: Project;
  className?: string;
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const config = categoryConfig[project.category] ?? fallbackConfig;
  const displayStack = project.techStack.slice(0, 4);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-xl dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark dark:hover:border-white/20 dark:hover:shadow-2xl",
        className
      )}
    >
      {/* Card header — gradient thumbnail */}
      <div
        className={cn(
          "relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br",
          config.gradient
        )}
      >
        <span className="select-none font-museo-moderno text-4xl font-bold tracking-tight text-neutral-900/10 dark:text-white/10">
          {getInitials(project.title)}
        </span>
        {project.featured && (
          <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
            Featured
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-6">
        {/* Category + year */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
              config.badge
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {project.category}
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {project.year}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-lg font-semibold tracking-tight text-neutral-900 transition-colors group-hover:text-accent dark:text-white">
          {project.title}
        </h3>

        {/* Description */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 line-clamp-3">
          {project.description}
        </p>

        {/* Tech stack */}
        <div className="mb-5 flex flex-wrap gap-1.5">
          {displayStack.map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:border-white/10 dark:text-neutral-400"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="rounded-lg border border-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-400 dark:border-white/10 dark:text-neutral-500">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-gap group-hover:gap-2">
            View case study
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
          {project.liveUrl && (
            <span
              onClick={(e) => {
                e.preventDefault();
                window.open(project.liveUrl!, "_blank", "noopener");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-500 transition hover:border-accent hover:text-accent dark:border-white/10 dark:text-neutral-400"
            >
              <ExternalLink className="h-3 w-3" />
              Live
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
