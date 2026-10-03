import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@promdevs/contracts";
import { MotionReveal } from "@/components/MotionReveal";
export function ProjectCard({ project }: { project: Project }) {
  return (
    <MotionReveal>
      <article className="project-card">
        <Link
          href={"/projects/" + project.slug}
          className="project-cover"
          aria-label={"Explore " + project.title}
        >
          {project.coverImage ? (
            <Image
              src={project.coverImage}
              alt={project.title + " project preview"}
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
              unoptimized
            />
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
          <h2 className="text-2xl tracking-tight">
            <Link href={"/projects/" + project.slug}>{project.title}</Link>
          </h2>
          <span className="muted text-xs pt-2">{project.year}</span>
        </div>
        <p className="muted text-sm leading-relaxed">{project.description}</p>
        <div className="service-tags mt-5">
          <span>{project.category}</span>
          {project.techStack.slice(0, 3).map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      </article>
    </MotionReveal>
  );
}
