import type { PublicProjectSummary } from "@promdevs/contracts";
import { breadcrumbData } from "../lib/project-catalog";
import { site } from "../lib/site";
import { ProjectCard } from "./ProjectCard";
import { MotionReveal } from "./MotionReveal";
import { ActionLink } from "./Action";

export function ProjectsDirectory({
  projects,
}: {
  projects: PublicProjectSummary[];
}) {
  return (
    <main id="main-content" className="shell portfolio-directory">
      <MotionReveal entrance className="catalog-intro">
        <h1>A closer look at our work.</h1>
        <p className="catalog-intro-copy">
          We make new ideas real and existing products better. Here’s what that
          looks like across web, mobile, and AI.
        </p>
      </MotionReveal>
      {projects.length > 0 ? (
        <section className="catalog-collection" aria-label="Our projects">
          <div className="catalog-grid">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        </section>
      ) : (
        <div className="portfolio-empty">
          <h2>More work to share soon.</h2>
          <p>In the meantime, tell us what you have in mind.</p>
          <ActionLink href="/#contact" label="Discuss your project" />
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbData(site.url, [
            { name: "Home", path: "/" },
            { name: "Our work", path: "/projects" },
          ]),
        }}
      />
    </main>
  );
}
