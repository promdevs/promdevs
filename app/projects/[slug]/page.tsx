import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MotionReveal } from "@/components/MotionReveal";
import { ActionLink } from "@/components/Action";
async function getProject(slug: string) {
  try {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project Not Found — PromDevs" };
  return {
    title: project.title,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { title: project.title, description: project.description },
    twitter: { title: project.title, description: project.description },
    description: project.description,
  };
}

export async function generateStaticParams() {
  try {
    const rows = await db.select({ slug: projects.slug }).from(projects);
    return rows.map(({ slug }) => ({ slug }));
  } catch {
    return [];
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  return (
    <>
      <Header />
      <main id="main-content" className="shell projects-page">
        <Link href="/projects" className="text-link mb-12">
          <ChevronLeft size={16} aria-hidden /> All projects
        </Link>
        <MotionReveal entrance className="section-intro">
          <p className="eyebrow">
            {project.category} / {project.year}
          </p>
          <div>
            <h1 className="section-heading">{project.title}</h1>
            <p className="muted">{project.description}</p>
            <div className="flex flex-wrap gap-6 mt-6">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  View live site <ArrowUpRight aria-hidden />
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  View source <ArrowUpRight aria-hidden />
                </a>
              )}
            </div>
          </div>
        </MotionReveal>
        {project.coverImage && (
          <MotionReveal className="project-detail-cover">
            <Image
              src={project.coverImage}
              alt={project.title + " interface"}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </MotionReveal>
        )}
        <div className="capability-strip mb-16">
          {project.techStack.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
        {[
          { label: "The challenge", text: project.problem },
          { label: "Our approach", text: project.solution },
          { label: "The outcome", text: project.results },
        ]
          .filter((section) => section.text)
          .map((section) => (
            <MotionReveal key={section.label}>
              <section className="case-section">
                <h2>{section.label}</h2>
                <p>{section.text}</p>
              </section>
            </MotionReveal>
          ))}
        <MotionReveal className="project-end">
          <h2 className="section-heading">
            Your next chapter
            <br />
            starts here.
          </h2>
          <ActionLink href="/#contact" label="Start a conversation" />
        </MotionReveal>
      </main>
      <Footer />
    </>
  );
}
