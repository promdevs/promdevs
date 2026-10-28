import Link from "next/link";
import type { ReactNode } from "react";
import {
  AppWindow,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BrainCircuit,
  CircleCheck,
  Focus,
  Globe2,
  Handshake,
  Layers3,
  Route,
  Smartphone,
} from "lucide-react";
import type { PublicProject } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ActionLink } from "./Action";
import { ProjectCover } from "./ProjectCover";
import { ProjectMarkdown } from "./ProjectMarkdown";
import { ProjectGallery } from "./ProjectGallery";
import { ProjectSnapshot } from "./ProjectSnapshot";
import { ProjectContents } from "./ProjectContents";
import { ProjectDestinations } from "./ProjectDestinations";
import {
  breadcrumbData,
  projectDestinations,
  projectLabel,
} from "../lib/project-catalog";
import { site } from "../lib/site";

export function ProjectCaseStudy({
  project,
  feedback,
}: {
  project: PublicProject;
  feedback?: ReactNode;
}) {
  const destinations = projectDestinations(project);
  const sections = [
    {
      id: "role",
      label: "Our role",
      text: project.roleSummary,
      icon: Handshake,
    },
    {
      id: "challenge",
      label: "The challenge",
      text: project.problem,
      icon: Focus,
    },
    {
      id: "approach",
      label: "Our approach",
      text: project.approach,
      icon: Route,
    },
    {
      id: "solution",
      label: "The solution",
      text: project.solution,
      icon: Layers3,
    },
    {
      id: "outcome",
      label: "The outcome",
      text: project.results,
      icon: CircleCheck,
    },
  ].filter((section) => section.text?.trim());
  return (
    <main id="main-content" className="shell portfolio-case">
      <Link href="/projects" className="case-back">
        <ArrowLeft size={16} aria-hidden="true" />
        All projects
      </Link>
      <div className="case-intro">
        <MotionReveal entrance>
          <div className="case-identity">
            {project.productTypes.map((type) => {
              const Icon =
                {
                  website: Globe2,
                  web_app: AppWindow,
                  mobile_app: Smartphone,
                  ai_product: BrainCircuit,
                }[type] || AppWindow;
              return (
                <span key={type} className="case-type-badge">
                  <Icon size={14} aria-hidden="true" />
                  {projectLabel(type)}
                </span>
              );
            })}
            {project.status === "completed" && (
              <span className="case-status">
                <BadgeCheck size={15} aria-hidden="true" />
                Completed
              </span>
            )}
            {project.status === "in_progress" && (
              <span className="case-status">In progress</span>
            )}
            {project.status === "ongoing" && (
              <span className="case-status">Ongoing</span>
            )}
          </div>
          <h1>{project.title}</h1>
          <p className="case-description">{project.description}</p>
        </MotionReveal>
        <ProjectDestinations links={destinations} />
      </div>
      <ProjectCover
        src={project.coverImage}
        alt={project.coverAlt || `${project.title} project preview`}
        hasGallery={project.gallery.length > 0}
      />
      <ProjectSnapshot project={project} />
      {sections.length > 0 && (
        <div className="case-story-layout">
          <ProjectContents
            sections={[
              ...sections.map(({ id, label }) => ({ id: `case-${id}`, label })),
              ...(project.gallery.length
                ? [{ id: "project-gallery", label: "Gallery" }]
                : []),
            ]}
          />
          <div className="case-story">
            {sections.map(({ id, label, text, icon: Icon }) => (
              <MotionReveal key={id}>
                <section
                  id={`case-${id}`}
                  className={`case-story-section${id === "outcome" ? " case-story-outcome" : ""}`}
                >
                  <span className="case-story-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <h2>{label}</h2>
                  <ProjectMarkdown>{text!}</ProjectMarkdown>
                </section>
              </MotionReveal>
            ))}
          </div>
        </div>
      )}
      <ProjectGallery media={project.gallery} title={project.title} />
      {feedback}
      <MotionReveal className="case-end">
        <span className="case-end-mark" aria-hidden="true">
          <ArrowUpRight size={40} />
        </span>
        <p className="eyebrow">Let’s work together</p>
        <h2>Have a project in mind?</h2>
        <div className="case-end-links">
          <ActionLink href="/#contact" label="Start a conversation" />
          <Link href="/projects" className="case-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to all projects
          </Link>
        </div>
      </MotionReveal>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbData(site.url, [
            { name: "Home", path: "/" },
            { name: "Our work", path: "/projects" },
            { name: project.title, path: `/projects/${project.slug}` },
          ]),
        }}
      />
    </main>
  );
}
