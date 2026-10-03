import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { db } from "@/db/client";
import { projects } from "@/db/schema";
import { ProjectsFilter } from "@/components/ProjectsFilter";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionReveal } from "@/components/MotionReveal";

export const metadata: Metadata = {
  title: "Our Work",
  alternates: { canonical: "/projects" },
  description:
    "Explore PromDevs project stories and digital product work. Contact our studio to discuss your web, mobile, or AI product.",
};

async function getAllProjects() {
  try {
    return await db
      .select()
      .from(projects)
      .orderBy(projects.featured, projects.year);
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const allProjects = await getAllProjects();

  return (
    <>
      <Header />
      <main id="main-content" className="shell projects-page">
        <Link href="/" className="text-link mb-12">
          <ChevronLeft size={16} aria-hidden /> Back to home
        </Link>
        <MotionReveal entrance className="section-intro">
          <p className="eyebrow">Our work</p>
          <div>
            <h1 className="section-heading">Ideas made real.</h1>
            <p className="muted">
              Explore the products, platforms, and digital experiences we build.
            </p>
          </div>
        </MotionReveal>
        <ProjectsFilter projects={allProjects} />
      </main>
      <Footer />
    </>
  );
}
