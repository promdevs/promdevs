"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FeaturedWorkProject } from "@/lib/portfolio-data";
import { createWorkRail } from "@/lib/work-rail-controller";
import { workServiceLabel } from "@/lib/work-service-label";

export function SelectedWorkRail({
  projects,
}: {
  projects: FeaturedWorkProject[];
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current) return;
    return createWorkRail(root.current);
  }, [projects]);

  return (
    <div
      className="selected-work-rail"
      ref={root}
      aria-label="Featured projects"
    >
      <div className="work-rail-sticky">
        <div className="work-rail-window">
          <div className="work-rail-track">
            {projects.map((project, index) => (
              <article className="work-rail-project" key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  prefetch={false}
                  className="work-rail-card"
                >
                  <div className="work-rail-cover">
                    <Image
                      src={project.coverImage}
                      alt={project.coverAlt}
                      fill
                      sizes="(min-width: 900px) 550px, (min-width: 700px) 650px, 90vw"
                      loading={index === 0 ? "eager" : "lazy"}
                      unoptimized
                      onError={(event) =>
                        event.currentTarget
                          .closest(".work-rail-cover")
                          ?.setAttribute("data-failed", "true")
                      }
                    />
                    <span className="work-rail-image-error">
                      Preview unavailable
                    </span>
                  </div>
                  <div className="work-rail-details">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="work-rail-delivery">
                      {project.services.length > 0 && (
                        <div className="work-rail-service-group">
                          <span className="work-rail-service-label">
                            What we did
                          </span>
                          <ul
                            className="work-rail-services"
                            aria-label="Services provided"
                          >
                            {project.services.map((service, index) => (
                              <li key={`${service}-${index}`}>
                                {workServiceLabel(service)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="work-rail-meta">
                        <span>
                          {project.productTypes
                            .map((type) => type.replaceAll("_", " "))
                            .join(" / ")}
                        </span>
                        <span className="work-rail-open">
                          View project{" "}
                          <ArrowUpRight size={17} aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="work-rail-footer">
        <Link href="/projects">
          View all projects <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
