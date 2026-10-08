export type MarkdownAction =
  | "bold"
  | "italic"
  | "heading"
  | "bullets"
  | "numbered"
  | "quote"
  | "link"
  | "code";

export function markdownEdit(
  value: string,
  start: number,
  end: number,
  action: MarkdownAction,
) {
  let from = start;
  let to = end;
  let selected = value.slice(from, to);
  let replacement: string;
  let offset: number;
  let length: number;
  if (["heading", "bullets", "numbered", "quote"].includes(action)) {
    // Block formatting applies to complete lines, not fragments of a paragraph.
    from = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
    const nextLine = value.indexOf("\n", end > start ? end - 1 : end);
    to = nextLine < 0 ? value.length : nextLine;
    selected =
      value.slice(from, to) ||
      (action === "heading"
        ? "Heading"
        : action === "quote"
          ? "Quote"
          : "List item");
    replacement = selected
      .split("\n")
      .map(
        (line, i) =>
          `${action === "heading" ? "## " : action === "bullets" ? "- " : action === "numbered" ? `${i + 1}. ` : "> "}${line}`,
      )
      .join("\n");
    offset = 0;
    length = replacement.length;
  } else if (action === "link") {
    replacement = `[${selected || "Link text"}](https://example.com)`;
    offset = replacement.indexOf("https://");
    length = "https://example.com".length;
  } else {
    const marker = action === "bold" ? "**" : action === "italic" ? "*" : "`";
    selected ||= action === "code" ? "code" : "text";
    replacement = marker + selected + marker;
    offset = marker.length;
    length = selected.length;
  }
  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: from + offset,
    end: from + offset + length,
  };
}

export const mediaGuidance = {
  cover: {
    title: "Upload cover image",
    recommendation: "Recommended: 4:3 · 1600 × 1200 px",
    formats: "JPEG, PNG or WebP · up to 10 MiB",
    accept: "image/jpeg,image/png,image/webp",
  },
  gallery: {
    title: "Add gallery media",
    recommendation: "Images: 4:3 or 16:9 · video: 16:9, 1920 × 1080 px",
    formats: "Images up to 10 MiB · MP4 / WebM up to 50 MiB",
    accept: "image/jpeg,image/png,image/webp,video/mp4,video/webm",
  },
  social: {
    title: "Upload social image",
    recommendation: "Recommended: 1.91:1 · 1200 × 630 px",
    formats: "JPEG, PNG or WebP · up to 10 MiB",
    accept: "image/jpeg,image/png,image/webp",
  },
  client: {
    title: "Upload client image",
    recommendation: "Recommended: square 1:1 · 512 × 512 px",
    formats: "JPEG, PNG or WebP · up to 10 MiB",
    accept: "image/jpeg,image/png,image/webp",
  },
  skill: {
    title: "Upload skill icon",
    recommendation:
      "Recommended: square 1:1 · 256 × 256 px, transparent PNG/WebP",
    formats: "JPEG, PNG or WebP · up to 10 MiB · SVG is not supported",
    accept: "image/jpeg,image/png,image/webp",
  },
} as const;
