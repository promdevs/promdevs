import {
  AppWindow,
  ArrowLeftRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  Clock3,
  Code2,
  Database,
  Layers3,
  LifeBuoy,
  MonitorSmartphone,
  Paintbrush,
  Rocket,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { PublicProject } from "@promdevs/contracts";
import { MotionReveal } from "./MotionReveal";
import { ProjectImage } from "./ProjectImage";
import { projectLabel } from "../lib/project-catalog";
import { workServiceLabel } from "../lib/work-service-label";
import { ProjectTools } from "./ProjectTools";

const serviceIcons = {
  product_design: Paintbrush,
  frontend_development: AppWindow,
  backend_development: Database,
  mobile_development: Smartphone,
  ai_development: BrainCircuit,
  app_rescue: LifeBuoy,
  migrations: ArrowLeftRight,
  qa_performance: ShieldCheck,
  deployment: Rocket,
};

export function ProjectSnapshot({ project }: { project: PublicProject }) {
  const hasFacts =
    project.platforms.length ||
    project.duration ||
    project.client ||
    project.year !== null;
  if (!(
    hasFacts ||
    project.services.length ||
    project.skills.length ||
    project.builtWith.length
  ))
    return null;
  return (
    <MotionReveal className="case-snapshot">
      {project.services.length > 0 && (
        <section
          className="case-deliverables"
          aria-labelledby="case-deliverables-title"
        >
          <h2 id="case-deliverables-title">
            <Layers3 size={18} aria-hidden="true" />
            {project.status === "completed"
              ? "What we delivered"
              : "What we're working on"}
          </h2>
          <ul className="case-service-badges">
            {project.services.map((service) => {
              const Icon =
                serviceIcons[service as keyof typeof serviceIcons] || Code2;
              return (
                <li key={service}>
                  <Icon size={16} aria-hidden="true" />
                  {workServiceLabel(service)}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {!!hasFacts && (
        <dl className="case-facts">
          {project.client && (
            <div className="case-fact-client">
              <dt>
                <UserRound size={15} aria-hidden="true" />
                Client
              </dt>
              <dd>
                {project.client.logo && (
                  <span className="case-client-avatar" aria-hidden="true">
                    <ProjectImage
                      src={project.client.logo}
                      alt=""
                      sizes="36px"
                    />
                  </span>
                )}
                {project.client.websiteUrl ? (
                  <a
                    href={project.client.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.client.name}
                    <ArrowUpRight size={14} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  project.client.name
                )}
              </dd>
            </div>
          )}
          {project.platforms.length > 0 && (
            <div>
              <dt>
                <MonitorSmartphone size={15} aria-hidden="true" />
                Platforms
              </dt>
              <dd>
                <ul className="case-platforms">
                  {project.platforms.map((platform) => (
                    <li key={platform}>{projectLabel(platform)}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {project.duration && (
            <div>
              <dt>
                <Clock3 size={15} aria-hidden="true" />
                Duration
              </dt>
              <dd>{project.duration}</dd>
            </div>
          )}
          {project.year !== null && (
            <div>
              <dt>
                <CalendarDays size={15} aria-hidden="true" />
                Year
              </dt>
              <dd>{project.year}</dd>
            </div>
          )}
        </dl>
      )}
      {project.skills.length > 0 && (
        <div className="case-stack">
          {project.skills.length > 0 && (
            <div>
              <p>
                <Code2 size={15} aria-hidden="true" />
                Technology
              </p>
              <ul className="case-stack-badges">
                {project.skills.map((skill) => (
                  <li key={skill.slug}>
                    {skill.iconUrl && (
                      <span className="case-stack-icon" aria-hidden="true">
                        <ProjectImage
                          src={skill.iconUrl}
                          alt=""
                          sizes="18px"
                          contain
                        />
                      </span>
                    )}
                    {skill.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <ProjectTools tools={project.builtWith} />
    </MotionReveal>
  );
}
