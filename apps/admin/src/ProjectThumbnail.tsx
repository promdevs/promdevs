import { useState } from "react";
import { FolderOpen } from "lucide-react";

function CoverImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <FolderOpen size={20} aria-hidden>
        <title>Image unavailable</title>
      </FolderOpen>
    );

  return (
    <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  );
}

export function ProjectThumbnail({
  src,
  contain = false,
}: {
  src: string | null;
  contain?: boolean;
}) {
  return (
    <span className={`catalog-thumbnail${contain ? " is-contained" : ""}`}>
      {src ? (
        <CoverImage key={src} src={src} />
      ) : (
        <FolderOpen size={20} aria-hidden />
      )}
    </span>
  );
}
