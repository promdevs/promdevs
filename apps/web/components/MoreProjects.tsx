import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicProjectSummary } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ProjectCard } from "./ProjectCard";

export function MoreProjects({
  projects,
  currentSlug,
}: {
  projects: PublicProjectSummary[];
  currentSlug: string;
}) {
  const others = projects
    .filter((project) => project.slug !== currentSlug)
    .slice(0, 3);
  if (!others.length) return null;

  return (
    <section className="case-more" aria-labelledby="more-projects-heading">
      <MotionReveal className="case-more-heading">
        <h2 id="more-projects-heading">More projects.</h2>
        <Link href="/projects" className="case-back">
          View all projects <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </MotionReveal>
      <div className="catalog-grid">
        {others.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            index={index}
            headingAs="h3"
            priority={false}
          />
        ))}
      </div>
    </section>
  );
}
