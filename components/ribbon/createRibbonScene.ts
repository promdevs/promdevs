import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type RibbonController = {
  setActive(active: boolean): void;
  setPaused(paused: boolean): void;
  setDark(dark: boolean): void;
  dispose(): void;
};

// A periodic swept, rounded rectangle: four surfaces, no open ends or topology changes.
export function createRibbonGeometry() {
  const segments = 240;
  const sides = 24;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segments + 1) * (sides + 1) * 3);
  const indices: number[] = [];
  for (let j = 0; j < sides; j++) {
    for (let i = 0; i < segments; i++) {
      const a = i * (sides + 1) + j;
      const b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const strip = segments * 6;
  geometry.addGroup(0, strip, 1);
  geometry.addGroup(strip, strip * (sides - 2), 0);
  geometry.addGroup(strip * (sides - 1), strip, 1);
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
  );
  geometry.setIndex(indices);
  const update = (phase: number) => {
    const wave = Math.sin(phase);
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      const radius = 1.5 + 0.12 * Math.cos(2 * t + wave * 0.45);
      const twist = t + 0.48 * Math.sin(t * 2 + wave * 0.65);
      const width = 0.43 + 0.12 * Math.cos(t * 2 - 0.5);
      for (let j = 0; j <= sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        // Superellipse cross-section keeps a broad face and softly rolled edges.
        const u =
          Math.sign(Math.cos(a)) *
          Math.pow(Math.abs(Math.cos(a)), 0.32) *
          width;
        const v =
          Math.sign(Math.sin(a)) *
          Math.pow(Math.abs(Math.sin(a)), 0.65) *
          0.032;
        const radial = u * Math.cos(twist) - v * Math.sin(twist);
        const depth = u * Math.sin(twist) + v * Math.cos(twist);
        const k = (i * (sides + 1) + j) * 3;
        positions[k] = (radius + radial) * Math.cos(t);
        positions[k + 1] =
          (radius + radial) * Math.sin(t) * (1.08 + 0.035 * wave);
        positions[k + 2] = 0.4 * Math.sin(2 * t + wave * 0.4) + depth;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    // Weld shading across the duplicated longitudinal and cross-section seams.
    const normals = geometry.attributes.normal;
    const average = (a: number, b: number) => {
      const x = normals.getX(a) + normals.getX(b);
      const y = normals.getY(a) + normals.getY(b);
      const z = normals.getZ(a) + normals.getZ(b);
      const length = Math.hypot(x, y, z) || 1;
      normals.setXYZ(a, x / length, y / length, z / length);
      normals.setXYZ(b, x / length, y / length, z / length);
    };
    for (let j = 0; j <= sides; j++) average(j, segments * (sides + 1) + j);
    for (let i = 0; i <= segments; i++)
      average(i * (sides + 1), i * (sides + 1) + sides);
    geometry.computeBoundingSphere();
  };
  update(0);
  return { geometry, update };
}

export function createRibbonScene(
  host: HTMLElement,
  onFailure: () => void,
): RibbonController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
  camera.position.set(0, 0, 7.8);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  const pearl = new THREE.MeshPhysicalMaterial({
    color: 0xe7e4dc,
    metalness: 0.28,
    roughness: 0.28,
    clearcoat: 0.45,
    clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.3,
    metalness: 0.4,
    side: THREE.DoubleSide,
  });
  const ribbon = createRibbonGeometry();
  const mesh = new THREE.Mesh(ribbon.geometry, [pearl, blue]);
  mesh.rotation.set(-0.08, -0.18, -0.15);
  scene.add(mesh);
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(-3, 5, 5);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x727681, 1.2));
  host.appendChild(renderer.domElement);
  let active = false,
    paused = false,
    disposed = false,
    failed = false,
    raf = 0,
    previous = 0,
    elapsed = 0;
  let pointerX = 0,
    pointerY = 0,
    tiltX = 0,
    tiltY = 0;
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const render = () => {
    if (!disposed && !failed) renderer.render(scene, camera);
  };
  const frame = (now: number) => {
    raf = 0;
    if (!active || paused || disposed || failed) return;
    const dt = Math.min((now - previous) / 1000 || 0, 0.05);
    previous = now;
    elapsed += dt;
    const phase = ((elapsed % 20) / 20) * Math.PI * 2;
    ribbon.update(phase);
    const smoothing = 1 - Math.exp(-dt * 4);
    tiltX += (pointerX - tiltX) * smoothing;
    tiltY += (pointerY - tiltY) * smoothing;
    mesh.rotation.set(
      -0.08 + tiltY,
      -0.18 + tiltX + 0.045 * Math.sin(phase),
      -0.15 + 0.03 * Math.sin(phase),
    );
    render();
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = performance.now();
    if (active && !paused && !disposed && !failed)
      raf = requestAnimationFrame(frame);
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    const widthScale = Math.max(0.68, Math.min(1.48, camera.aspect * 1.02));
    mesh.scale.set(widthScale, camera.aspect < 0.72 ? 0.72 : 0.86, 1);
    camera.position.z = camera.aspect < 0.72 ? 8.6 : 7.8;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };
  const pointer = (event: PointerEvent) => {
    if (!fine.matches || event.pointerType === "touch") return;
    const rect = host.getBoundingClientRect();
    pointerX =
      (Math.max(
        -1,
        Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1),
      ) *
        Math.PI) /
      45;
    pointerY =
      (Math.max(
        -1,
        Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1),
      ) *
        Math.PI) /
      45;
  };
  const leave = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const lost = (event: Event) => {
    event.preventDefault();
    failed = true;
    sync();
    onFailure();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  window.addEventListener("pointermove", pointer);
  window.addEventListener("pointerleave", leave);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  resize();
  return {
    setActive(value) {
      active = value;
      sync();
    },
    setPaused(value) {
      paused = value;
      sync();
    },
    setDark(dark) {
      pearl.color.set(dark ? 0xe7e4dc : 0x25282d);
      pearl.metalness = dark ? 0.28 : 0.48;
      render();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      ribbon.geometry.dispose();
      pearl.dispose();
      blue.dispose();
      environmentMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
