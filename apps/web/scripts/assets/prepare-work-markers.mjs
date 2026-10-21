import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as THREE from "three";

// Offline generation: dots illustrate country-level activity, not client addresses.
const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/assets/prepare-work-markers.mjs <ne_110m_admin_0_countries.geojson>",
  );
const geography = JSON.parse(await readFile(source, "utf8"));
const requests = [
  ["USA", "US", "United States", 50, [-125, 25, -66, 49]],
  ["GBR", "GB", "United Kingdom", 10],
  ["AUS", "AU", "Australia", 3],
  ["IND", "IN", "India", 2],
  ["DEU", "DE", "Germany", 1],
  ["PRI", "PR", "Puerto Rico", 1],
  ["FRA", "FR", "France", 1],
  ["SVN", "SI", "Slovenia", 1],
  ["NGA", "NG", "Nigeria", 1],
  ["ARE", "AE", "United Arab Emirates", 1],
];
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
function halton(index, base) {
  let fraction = 1,
    result = 0;
  while (index > 0) {
    fraction /= base;
    result += fraction * (index % base);
    index = Math.floor(index / base);
  }
  return result;
}
const countries = requests.map(([a3, code, name, count, clip]) => {
  const feature = geography.features.find((f) => f.properties.ADM0_A3 === a3);
  if (!feature) throw new Error(`Missing boundary: ${a3}`);
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const contains = (lon, lat) =>
    polygons.some(
      (rings) =>
        inRing(lon, lat, rings[0]) &&
        !rings.slice(1).some((r) => inRing(lon, lat, r)),
    );
  // Keep France in metropolitan Europe, rather than its overseas geometry.
  const bounds =
    clip ?? (code === "FR" ? [-5.2, 41.3, 9.7, 51.1] : feature.bbox);
  const [west, south, east, north] = bounds;
  const latitude = feature.properties.LABEL_Y,
    longitude = feature.properties.LABEL_X;
  if (!contains(longitude, latitude))
    throw new Error(`Label is not on land: ${code}`);
  const markers = [[latitude, longitude]];
  const candidates = [];
  for (let i = 1; i <= 5000; i++) {
    const lon = +(west + halton(i, 2) * (east - west)).toFixed(4);
    const lat = +(south + halton(i, 3) * (north - south)).toFixed(4);
    if (contains(lon, lat)) candidates.push([lat, lon]);
  }
  // Farthest-point sampling gives an even, deterministic spread without jitter.
  while (markers.length < count) {
    let best = -1,
      distance = -1;
    candidates.forEach(([lat, lon], i) => {
      const nearest = Math.min(
        ...markers.map(
          ([y, x]) =>
            (lat - y) ** 2 + ((lon - x) * Math.cos((lat * Math.PI) / 180)) ** 2,
        ),
      );
      if (nearest > distance) {
        distance = nearest;
        best = i;
      }
    });
    if (best < 0 || distance <= 0)
      throw new Error(`Insufficient land points: ${code}`);
    markers.push(candidates.splice(best, 1)[0]);
  }
  return { code, name, latitude, longitude, markers };
});
const root = fileURLToPath(new URL("../../", import.meta.url));
await writeFile(
  `${root}data/country-markers.json`,
  JSON.stringify(countries, null, 2) + "\n",
);

// Match the scene's initial three-quarter view for loading, WebGL failure, and no JS.
const land = JSON.parse(
  await readFile(`${root}data/globe-points.json`, "utf8"),
);
const rotation = new THREE.Matrix4().makeRotationFromEuler(
  new THREE.Euler(0.08, 0.9, 0, "XYZ"),
);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
camera.position.z = 3.6;
camera.updateMatrixWorld();
function project(point, radius) {
  const rotated = new THREE.Vector3(...point).applyMatrix4(rotation);
  const visibility = Math.min(
    1,
    Math.max(0, (rotated.z - 1 / 3.6 - 0.025) / 0.16),
  );
  const p = rotated.clone().multiplyScalar(radius).project(camera);
  return { x: (p.x + 1) * 300, y: (1 - p.y) * 300, visibility };
}
const dots = land
  .flatMap((point) => {
    const p = project(point, 1.004);
    return p.visibility <= 0
      ? []
      : [
          `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="1.25" opacity="${(p.visibility * 0.75).toFixed(2)}"/>`,
        ];
  })
  .join("");
const markers = countries
  .flatMap((c) => c.markers)
  .flatMap(([lat, lon]) => {
    const y = (lat * Math.PI) / 180,
      x = (lon * Math.PI) / 180;
    const p = project(
      [Math.cos(y) * Math.sin(x), Math.sin(y), Math.cos(y) * Math.cos(x)],
      1.015,
    );
    return p.visibility <= 0
      ? []
      : [
          `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="2.25" opacity="${p.visibility.toFixed(2)}"/>`,
        ];
  })
  .join("");
await writeFile(
  `${root}public/images/globe-poster.svg`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><g fill="#737373">${dots}</g><g fill="#2563eb">${markers}</g></svg>\n`,
);
console.log(
  `Prepared ${countries.length} countries/territories and ${countries.reduce((n, c) => n + c.markers.length, 0)} markers, each within its boundary.`,
);
