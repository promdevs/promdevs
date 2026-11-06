import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { site } from "../lib/site";
import { breadcrumbData } from "../lib/project-catalog";

export type LegalDocumentData = {
  title: string;
  path: string;
  description: string;
  introduction: string;
  updated: string;
  sections: { id: string; title: string; content: ReactNode }[];
  related: { title: string; path: string };
};

export function LegalDocument({ document }: { document: LegalDocumentData }) {
  const updated = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${document.updated}T00:00:00Z`));
  return (
    <main id="main-content" className="shell legal-page">
      <header className="legal-intro">
        <p className="eyebrow">Legal</p>
        <h1>{document.title}</h1>
        <p className="legal-intro-copy">{document.introduction}</p>
        <div className="legal-meta">
          <p>{site.legalName}</p>
          <p>
            Last updated <time dateTime={document.updated}>{updated}</time>
          </p>
        </div>
      </header>
      <div className="legal-layout">
        <aside className="legal-contents">
          <nav aria-label="On this page">
            <p>On this page</p>
            <ul role="list">
              {document.sections.map(({ id, title }) => (
                <li key={id}>
                  <a href={`#${id}`}>{title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="legal-body">
          {document.sections.map(({ id, title, content }) => (
            <section key={id} id={id} aria-labelledby={`${id}-heading`}>
              <h2 id={`${id}-heading`}>{title}</h2>
              {content}
            </section>
          ))}
          <div className="legal-end">
            <p>Also read</p>
            <Link href={document.related.path}>
              {document.related.title}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: breadcrumbData(site.url, [
            { name: "Home", path: "/" },
            { name: document.title, path: document.path },
          ]),
        }}
      />
    </main>
  );
}
