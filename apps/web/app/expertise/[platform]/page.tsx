import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpertisePage } from "@/components/ExpertisePage";
import { getExpertisePage } from "@/data/expertise";
import { getPlatformProjects, getReviewCatalog } from "@/lib/api";
import { socialMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ platform: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { platform } = await params;
  const page = getExpertisePage(platform);
  if (!page) notFound();
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/expertise/${platform}` },
    ...socialMetadata({
      title: page.title,
      description: page.description,
      path: `/expertise/${platform}`,
    }),
  };
}

export default async function PlatformPage({ params }: Props) {
  const { platform } = await params;
  const page = getExpertisePage(platform);
  if (!page) notFound();
  const [projects, reviews] = await Promise.all([
    getPlatformProjects(platform),
    getReviewCatalog().catch(() => []),
  ]);
  const slugs = new Set(projects.map(({ slug }) => slug));
  const feedback = reviews
    .filter(({ projectSlug }) => projectSlug && slugs.has(projectSlug))
    .slice(0, 1);
  return (
    <ExpertisePage
      platform={platform}
      page={page}
      projects={projects}
      reviews={feedback}
    />
  );
}
