"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { type Project } from "@/db/schema";
import { ProjectCard } from "@/components/ProjectCard";
import { cn } from "@/lib/utils";

const ALL = "All";

interface ProjectsFilterProps {
  projects: Project[];
}

export function ProjectsFilter({ projects }: ProjectsFilterProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(projects.map((p) => p.category))).sort();
    return [ALL, ...cats];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return projects.filter((p) => {
      const matchesCategory =
        activeCategory === ALL || p.category === activeCategory;
      const matchesQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q)) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [projects, query, activeCategory]);

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            placeholder="Search projects, tech, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:placeholder:text-neutral-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                activeCategory === cat
                  ? "border-accent bg-accent text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-accent/50 hover:text-accent dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-300"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
        {filtered.length === projects.length
          ? `${projects.length} projects`
          : `${filtered.length} of ${projects.length} projects`}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 py-20 dark:border-white/10">
          <p className="text-sm font-medium text-neutral-500">No projects match your search.</p>
          <button
            onClick={() => { setQuery(""); setActiveCategory(ALL); }}
            className="mt-3 text-sm text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
