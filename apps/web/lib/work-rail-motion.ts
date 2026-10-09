export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function followWorkPosition(
  current: number,
  target: number,
  elapsedMs: number,
) {
  // Time-based damping keeps the same pace on 60Hz and high-refresh displays.
  return (
    current +
    (target - current) * (1 - Math.exp(-clamp(elapsedMs, 0, 64) / 100))
  );
}

export function workRailTravel(count: number, viewportHeight: number) {
  return Math.min(3, Math.max(0, count - 1) * 0.55) * viewportHeight;
}

export function workRailPosition(
  viewportWidth: number,
  viewportHeight: number,
  headerHeight: number,
  sectionLeft: number,
  stageHeight: number,
) {
  return {
    left: sectionLeft,
    top: Math.max(
      headerHeight + (viewportWidth < 700 ? 12 : 24),
      headerHeight + (viewportHeight - headerHeight - stageHeight) / 2,
    ),
  };
}

export function workCardLayout(viewportWidth: number) {
  return {
    split: viewportWidth >= 900,
    width:
      viewportWidth < 700
        ? Math.max(240, viewportWidth - 64)
        : viewportWidth < 900
          ? Math.min(700, viewportWidth - 80)
          : Math.min(1100, viewportWidth - 120),
    gap: viewportWidth < 700 ? 18 : 28,
    padding: viewportWidth < 700 ? 16 : 22,
  };
}

// Position, not scroll direction, controls the fade so reverse entrances match.
export function workCardPresentation(distance: number) {
  const t = clamp((1.65 - Math.abs(distance)) / 1.15);
  const opacity = t * t * (3 - 2 * t);
  return { opacity, scale: 0.975 + opacity * 0.025, y: (1 - opacity) * 16 };
}
