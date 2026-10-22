export type GlobeAppearance = "auto" | "dark" | "inverse";

export function globeUsesDarkPalette(
  appearance: GlobeAppearance,
  pageDark: boolean,
) {
  if (appearance === "dark") return true;
  return appearance === "inverse" ? !pageDark : pageDark;
}
