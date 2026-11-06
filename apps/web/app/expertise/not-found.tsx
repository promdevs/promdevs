import { ActionLink } from "@/components/Action";

export default function ExpertiseNotFound() {
  return (
    <main
      id="main-content"
      className="shell expertise-page expertise-unavailable"
    >
      <p className="eyebrow">Expertise</p>
      <h1>Let’s find the right fit.</h1>
      <p>
        This expertise page isn’t available. Tell us what you’re building, or
        take a look at our work.
      </p>
      <div className="expertise-actions">
        <ActionLink href="/?view=html#contact" label="Start a conversation" />
        <ActionLink
          href="/projects"
          label="View our work"
          variant="secondary"
        />
      </div>
    </main>
  );
}
