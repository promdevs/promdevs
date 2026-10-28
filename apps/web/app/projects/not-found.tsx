import Link from "next/link";
import { ActionLink } from "@/components/Action";

export default function ProjectNotFound() {
  return (
    <main id="main-content" className="shell portfolio-status">
      <p className="eyebrow">Our work</p>
      <h1>This project isn’t here.</h1>
      <p>It may no longer be available. There’s more work to explore.</p>
      <div className="portfolio-status-actions">
        <ActionLink href="/projects" label="View all projects" />
        <Link href="/#contact" className="text-link">
          Discuss your project
        </Link>
      </div>
    </main>
  );
}
