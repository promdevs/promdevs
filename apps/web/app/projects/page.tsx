import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProjectCatalog } from "@/lib/api";
import { ProjectsDirectory } from "@/components/ProjectsDirectory";

export const dynamic = "force-dynamic";
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateMetadata(): Metadata {
  const title = "Our work";
  const description =
    "Explore the web apps, mobile apps, AI products, and websites PromDevs has designed, built, and helped move forward.";
  return {
    title,
    description,
    alternates: {
      canonical: "/projects",
    },
    openGraph: {
      title: `${title} | PromDevs`,
      description,
      url: "/projects",
    },
    twitter: { title: `${title} | PromDevs`, description },
  };
}

export default async function ProjectsPage({ searchParams }: Props) {
  const params = await searchParams;
  if (
    params.page !== undefined ||
    params.q !== undefined ||
    params.type !== undefined
  )
    redirect("/projects");
  const projects = await getProjectCatalog();
  return <ProjectsDirectory projects={projects} />;
}
