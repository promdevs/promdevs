import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProject, getProjectReviews } from "@/lib/api";
import { ProjectCaseStudy } from "@/components/ProjectCaseStudy";
import { ProjectFeedback } from "@/components/ProjectFeedback";
import { projectPageTitle } from "@/lib/project-catalog";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  const title = projectPageTitle(project);
  const description = project.seoDescription || project.description;
  const image = project.socialImage || project.coverImage;
  return {
    title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title,
      description,
      url: `/projects/${project.slug}`,
      ...(image
        ? { images: [{ url: image, alt: project.coverAlt || project.title }] }
        : {}),
    },
    twitter: { title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();
  const reviews = await getProjectReviews(project.slug);
  return (
    <ProjectCaseStudy
      project={project}
      feedback={<ProjectFeedback reviews={reviews} />}
    />
  );
}
