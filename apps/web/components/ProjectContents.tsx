"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight } from "lucide-react";

export function ProjectContents({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(
          sections.find((section) => visible.has(section.id))?.id || "",
        );
      },
      { rootMargin: "-150px 0px -35% 0px" },
    );
    sections.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="case-contents" aria-label="Inside this project">
      <p>
        <ArrowDownRight size={16} aria-hidden="true" />
        Inside the project
      </p>
      <ul>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
