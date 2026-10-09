import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Offline asset generation. Input: Natural Earth's ne_110m_land.geojson.
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/assets/prepare-globe.mjs <land.geojson>",
  );
const geo = JSON.parse(await readFile(source, "utf8"));
const polygons = geo.features.flatMap(({ geometry }) =>
  geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates,
);
const prepared = polygons.map((rings) => ({
  rings,
  bounds: rings[0].reduce(
    (b, [x, y]) => [
      Math.min(b[0], x),
      Math.min(b[1], y),
      Math.max(b[2], x),
      Math.max(b[3], y),
    ],
    [180, 90, -180, -90],
  ),
}));
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
const points = [];
const count = 23000;
for (let i = 0; i < count; i++) {
  const y = 1 - (2 * (i + 0.5)) / count;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = ((i * 137.50776405003785 + 180) % 360) - 180;
  if (
    !prepared.some(
      ({ bounds: b, rings }) =>
        lon >= b[0] &&
        lon <= b[2] &&
        lat >= b[1] &&
        lat <= b[3] &&
        inRing(lon, lat, rings[0]) &&
        !rings.slice(1).some((r) => inRing(lon, lat, r)),
    )
  )
    continue;
  const rad = (lon * Math.PI) / 180,
    r = Math.sqrt(1 - y * y);
  points.push(
    [r * Math.sin(rad), y, r * Math.cos(rad)].map((v) => +v.toFixed(4)),
  );
}
const root = fileURLToPath(new URL("../../", import.meta.url));
await mkdir(`${root}data`, { recursive: true });
await mkdir(`${root}public/images`, { recursive: true });
await writeFile(`${root}data/globe-points.json`, JSON.stringify(points));
const dots = points
  .filter((p) => p[2] > 0)
  .map(
    ([x, y, z]) =>
      `<circle cx="${(300 + x * 258).toFixed(2)}" cy="${(300 - y * 258).toFixed(2)}" r="1.25" opacity="${(0.2 + 0.65 * z).toFixed(2)}"/>`,
  )
  .join("");
await writeFile(
  `${root}public/images/globe-poster.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><g fill="#737373">${dots}</g></svg>`,
);
console.log(
  `Generated ${points.length} land dots and a matching static poster.`,
);
