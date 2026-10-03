// Run: node scripts/assets/prepare-apollo.mjs /path/to/KAS353_small.stl
// Public-domain source and provenance: public/models/APOLLO-LICENSE.md.
import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import {
  mergeVertices,
  mergeGeometries,
} from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
const source = readFileSync(process.argv[2]);
const triangles = [];
for (let i = 0; i < source.readUInt32LE(80); i++) {
  triangles.push(
    Array.from({ length: 3 }, (_, v) =>
      Array.from({ length: 3 }, (_, a) =>
        source.readFloatLE(84 + i * 50 + 12 + v * 12 + a * 4),
      ),
    ),
  );
}

// Clip triangles to each crop plane and close the resulting planar boundary loops.
function clip(input, axis, value, sign) {
  const output = [],
    segments = [];
  for (const tri of input) {
    const polygon = [],
      intersections = [];
    for (let i = 0; i < 3; i++) {
      const a = tri[i],
        b = tri[(i + 1) % 3];
      const da = (a[axis] - value) * sign,
        db = (b[axis] - value) * sign;
      if (da >= 0) polygon.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db),
          p = a.map((v, j) => v + (b[j] - v) * t);
        p[axis] = value;
        polygon.push(p);
        intersections.push(p);
      }
    }
    if (intersections.length === 2) segments.push(intersections);
    for (let i = 1; i < polygon.length - 1; i++)
      output.push([polygon[0], polygon[i], polygon[i + 1]]);
  }
  if (axis === 2 && value === 112) return output;
  const key = (p) => p.map((n) => Math.round(n * 10000)).join(",");
  const points = new Map(),
    edges = new Map();
  for (const [a, b] of segments) {
    const ka = key(a),
      kb = key(b);
    if (ka === kb) continue;
    points.set(ka, a);
    points.set(kb, b);
    if (!edges.has(ka)) edges.set(ka, new Set());
    if (!edges.has(kb)) edges.set(kb, new Set());
    edges.get(ka).add(kb);
    edges.get(kb).add(ka);
  }
  for (const [start, adjacent] of edges) {
    if (!adjacent.size) continue;
    const loop = [start];
    let current = start;
    for (let guard = 0; guard < segments.length + 1; guard++) {
      const next = edges.get(current)?.values().next().value;
      if (!next) break;
      edges.get(current).delete(next);
      edges.get(next).delete(current);
      if (next === start) break;
      loop.push(next);
      current = next;
    }
    if (loop.length < 3) continue;
    const vertices = loop.map((k) => points.get(k));
    const axes = [0, 1, 2].filter((a) => a !== axis);
    const flat = vertices.map((p) => new THREE.Vector2(p[axes[0]], p[axes[1]]));
    for (const face of THREE.ShapeUtils.triangulateShape(flat, [])) {
      const tri = face.map((i) => vertices[i]);
      const ab = new THREE.Vector3(...tri[1]).sub(new THREE.Vector3(...tri[0]));
      const ac = new THREE.Vector3(...tri[2]).sub(new THREE.Vector3(...tri[0]));
      if (ab.cross(ac).getComponent(axis) * sign > 0) tri.reverse();
      output.push(tri);
    }
  }
  return output;
}
const group = new THREE.Group();
for (const [name, planes] of [
  [
    "ApolloHead",
    [
      [2, 112, 1],
      [0, 36, -1],
    ],
  ],
  [
    "ApolloTorso",
    [
      [2, 83, 1],
      [2, 112, -1],
      [0, 19, 1],
      [0, 46, -1],
    ],
  ],
]) {
  let cropped = triangles;
  for (const [axis, value, sign] of planes)
    cropped = clip(cropped, axis, value, sign);
  const positions = cropped.flatMap((tri) =>
    tri.flatMap(([x, y, z]) => [
      (x - 26.2) * 0.055,
      (z - 112) * 0.055,
      -(y - 21) * 0.055,
    ]),
  );
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const geometry = mergeVertices(raw, 0.0002);
  geometry.computeVertexNormals();
  raw.dispose();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  mesh.name = name;
  group.add(mesh);
  console.log(
    name,
    cropped.length,
    "triangles",
    geometry.getAttribute("position").count,
    "vertices",
  );
}
// Weld the neck before posing so head motion never exposes a cut seam.
const joined = mergeGeometries(group.children.map((mesh) => mesh.geometry));
const joinedPositions = joined.getAttribute("position");
const pivot = new THREE.Vector3(0.15, 0, -0.2);
for (let i = 0; i < joinedPositions.count; i++) {
  const point = new THREE.Vector3().fromBufferAttribute(joinedPositions, i);
  const weight = THREE.MathUtils.smoothstep(point.y, -0.25, 0.3);
  point
    .sub(pivot)
    .applyEuler(new THREE.Euler(0.045 * weight, -0.22 * weight, 0))
    .add(pivot);
  joinedPositions.setXYZ(i, point.x, point.y, point.z);
}
joined.deleteAttribute("normal");
const welded = mergeVertices(joined, 0.0002);
welded.computeVertexNormals();
group.clear();
const sculpture = new THREE.Mesh(welded, new THREE.MeshStandardMaterial());
sculpture.name = "ApolloSculpture";
group.add(sculpture);
// GLTFExporter's binary path uses FileReader; provide its minimal Node equivalent.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};
const binary = await new GLTFExporter().parseAsync(group, { binary: true });
writeFileSync("public/models/apollo.glb", Buffer.from(binary));
console.log("GLB bytes:", binary.byteLength);
