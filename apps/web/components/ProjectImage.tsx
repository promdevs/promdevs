"use client";

import Image from "next/image";
import { useState } from "react";

export function ProjectImage({
  src,
  alt,
  sizes,
  priority = false,
  contain = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  contain?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src)
    return (
      <span className="project-image-unavailable">Preview unavailable</span>
    );
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      unoptimized
      style={{ objectFit: contain ? "contain" : "cover" }}
      onError={() => setFailed(src)}
    />
  );
}
