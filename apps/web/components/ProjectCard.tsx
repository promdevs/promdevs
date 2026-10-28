import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicProjectSummary } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ProjectImage } from "./ProjectImage";
import { projectLabel } from "../lib/project-catalog";

export function ProjectCard({
  project,
  index = 0,
}: {
  project: PublicProjectSummary;
  index?: number;
}) {
  return (
    <MotionReveal delayMs={(index % 3) * 80}>
      <article className="catalog-card">
        <svg className="work-grid-outline" aria-hidden="true" focusable="false">
          <rect
            className="work-grid-outline-base"
            x="1"
            y="1"
            rx="18"
            fill="none"
          />
          <rect
            className="work-grid-outline-runner"
            x="1"
            y="1"
            rx="18"
            fill="none"
            pathLength="100"
          />
        </svg>
        <div className="catalog-card-cover">
          <ProjectImage
            src={project.coverImage}
            alt={project.coverAlt}
            priority={index < 3}
            sizes="(min-width: 1100px) 30vw, (min-width: 700px) 46vw, 92vw"
          />
          {project.productTypes.length > 0 && (
            <span className="catalog-card-type">
              {project.productTypes.map(projectLabel).join(" / ")}
            </span>
          )}
        </div>
        <div className="catalog-card-info">
          <h2>
            <Link href={`/projects/${project.slug}`} prefetch={false}>
              <span>{project.title}</span>
            </Link>
          </h2>
          <ArrowUpRight size={19} aria-hidden="true" />
          <p>{project.description}</p>
        </div>
      </article>
    </MotionReveal>
  );
}
