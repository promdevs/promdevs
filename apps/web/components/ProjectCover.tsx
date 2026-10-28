import { ArrowDownRight, Images } from "lucide-react";
import { MotionReveal } from "./MotionReveal";
import { ProjectImage } from "./ProjectImage";

export function ProjectCover({
  src,
  alt,
  hasGallery,
}: {
  src: string;
  alt: string;
  hasGallery: boolean;
}) {
  if (!src) return null;
  return (
    <MotionReveal className="case-cover">
      <span
        className="case-cover-ambience"
        aria-hidden="true"
        style={{ backgroundImage: `url(${JSON.stringify(src)})` }}
      />
      <span className="case-cover-wash" aria-hidden="true" />
      <ProjectImage
        src={src}
        alt={alt}
        contain
        priority
        sizes="(min-width: 1440px) 1320px, 92vw"
      />
      {hasGallery && (
        <a className="case-cover-link" href="#project-gallery">
          <Images size={16} aria-hidden="true" />
          View gallery
          <ArrowDownRight size={16} aria-hidden="true" />
        </a>
      )}
    </MotionReveal>
  );
}
