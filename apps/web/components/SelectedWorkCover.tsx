"use client";

import Image from "next/image";
import { useState } from "react";

export function SelectedWorkCover({ src, alt }: { src: string; alt: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) {
    return <span className="work-grid-image-error">Preview unavailable</span>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1100px) 34vw, (min-width: 700px) 46vw, 92vw"
      loading="lazy"
      unoptimized
      onError={() => setFailedSource(src)}
    />
  );
}
