import { useState } from "react";
import { FolderOpen } from "lucide-react";

function CoverImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <FolderOpen size={20} aria-hidden>
        <title>Cover image unavailable</title>
      </FolderOpen>
    );

  return (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}

export function ProjectThumbnail({ src }: { src: string | null }) {
  return (
    <span className="catalog-thumbnail">
      {src ? (
        <CoverImage key={src} src={src} />
      ) : (
        <FolderOpen size={20} aria-hidden />
      )}
    </span>
  );
}
