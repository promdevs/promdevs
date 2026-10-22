import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MotionReveal } from "./MotionReveal";
import { SelectedWorkCover } from "./SelectedWorkCover";
import type { FeaturedWorkProject } from "../lib/portfolio-data";

export function SelectedWorkGrid({
  projects,
}: {
  projects: FeaturedWorkProject[];
}) {
  if (!projects.length) return null;

  return (
    <>
      <div className="selected-work-grid" aria-label="Featured projects">
        {projects.map((project, index) => (
          <MotionReveal key={project.id} delayMs={(index % 2) * 100}>
            <article className="work-grid-project work-grid-link">
              <svg
                className="work-grid-outline"
                aria-hidden="true"
                focusable="false"
              >
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
              <div className="work-grid-cover">
                <SelectedWorkCover
                  src={project.coverImage}
                  alt={project.coverAlt}
                />
                {project.productTypes.length > 0 && (
                  <span className="work-grid-type">
                    {project.productTypes
                      .map((type) => type.replaceAll("_", " "))
                      .join(" / ")}
                  </span>
                )}
              </div>
              <div className="work-grid-info">
                <div className="work-grid-title-row">
                  <h3 id={`work-project-${project.id}`}>
                    <Link
                      href={`/projects/${project.slug}`}
                      prefetch={false}
                      className="work-grid-title-link"
                    >
                      <span>{project.title}</span>
                    </Link>
                  </h3>
                  <span className="work-grid-arrow">
                    <ArrowUpRight size={19} aria-hidden="true" />
                  </span>
                </div>
                <p className="work-grid-description">{project.description}</p>
              </div>
            </article>
          </MotionReveal>
        ))}
      </div>
      <div className="work-grid-footer">
        <Link href="/projects">
          View all projects <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
