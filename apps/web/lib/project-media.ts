import type { PublicProject } from "@promdevs/contracts";

export type ProjectMedia = PublicProject["gallery"][number];

export const isPortraitMedia = (item: ProjectMedia) =>
  !!(item.width && item.height && item.width / item.height < 0.8);

export function orderedProjectMedia(media: ProjectMedia[]): ProjectMedia[] {
  const ranked = media
    .map((item, order) => ({
      item,
      order,
      area: item.width && item.height ? item.width * item.height : 0,
    }))
    .sort((a, b) => b.area - a.area || a.order - b.order);
  const result: ProjectMedia[] = [];
  for (let start = 0; start < ranked.length;) {
    let end = start + 1;
    // Tiny export-size differences should not scramble a sequence of app screens.
    while (end < ranked.length && ranked[end].area >= ranked[start].area * 0.98)
      end++;
    result.push(
      ...ranked
        .slice(start, end)
        .sort((a, b) => a.order - b.order)
        .map(({ item }) => item),
    );
    start = end;
  }
  return result;
}

export function projectGalleryLayout(media: ProjectMedia[]) {
  if (media.length && media.every(isPortraitMedia)) return "phones";
  if (
    media.length === 2 &&
    !isPortraitMedia(media[0]) &&
    isPortraitMedia(media[1])
  )
    return "mixed";
  return "editorial";
}
