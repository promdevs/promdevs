import { getSelectedProjects } from "@/lib/api";
import { SelectedWorkRail } from "@/components/SelectedWorkRail";
import { MotionReveal } from "@/components/MotionReveal";

export async function Projects() {
  const projects = await getSelectedProjects();
  if (!projects.length) return null;
  return (
    <section
      id="work"
      className="shell selected-work"
      aria-labelledby="work-title"
    >
      <MotionReveal className="portfolio-intro">
        <div>
          <p className="eyebrow">Selected work</p>
          <h2 id="work-title" className="section-heading">
            Built. Rebuilt. Made better.
          </h2>
        </div>
        <p className="muted">
          A selection of our work. Thoughtful design, solid engineering, and the
          details that make a product feel right.
        </p>
      </MotionReveal>
      <SelectedWorkRail projects={projects} />
    </section>
  );
}
