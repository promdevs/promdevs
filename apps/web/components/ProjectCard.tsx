import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicProjectSummary } from "@promdevs/contracts";
import { MotionReveal } from "@/components/MotionReveal";
export function ProjectCard({
  project,
  headingLevel: Heading = "h2",
  editorial = false,
  delayMs = 0,
}: {
  project: PublicProjectSummary;
  headingLevel?: "h2" | "h3";
  editorial?: boolean;
  delayMs?: number;
}) {
  return (
    <MotionReveal delayMs={delayMs} className={editorial ? "work-preview" : ""}>
      <article className="project-card">
        <Link
          href={"/projects/" + project.slug}
          className="project-cover"
          aria-label={"Explore " + project.title}
        >
          {project.coverImage ? (
            <MotionReveal image={editorial} className="project-image-reveal">
              <Image
                src={project.coverImage}
                alt={project.coverAlt}
                fill
                sizes={
                  editorial
                    ? "(max-width: 767px) 100vw, (min-width: 1440px) 640px, 50vw"
                    : "(max-width: 767px) 100vw, 50vw"
                }
                className="object-cover"
                unoptimized
              />
            </MotionReveal>
          ) : (
            <span className="project-monogram" aria-hidden>
              {project.title
                .split(/\s+/)
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
          <span className="project-open">
            <ArrowUpRight size={20} aria-hidden />
          </span>
        </Link>
        <div className="flex justify-between gap-4 mt-5 mb-3">
          <Heading className="project-title text-2xl tracking-tight">
            <Link href={"/projects/" + project.slug}>{project.title}</Link>
          </Heading>
          {project.year !== null && (
            <span className="muted text-xs pt-2">{project.year}</span>
          )}
        </div>
        <p className="muted text-sm leading-relaxed">{project.description}</p>
        <div className="service-tags mt-5">
          {project.productTypes.map((type) => (
            <span key={type}>{type.replaceAll("_", " ")}</span>
          ))}
        </div>
      </article>
    </MotionReveal>
  );
}
