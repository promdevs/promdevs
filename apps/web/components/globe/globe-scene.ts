import * as THREE from "three";
import land from "@/data/globe-points.json";
import type { WorkCountry } from "@/data/countries";
import { countryPoint, markerVisibility } from "@/lib/client-stories-motion";

export interface MarkerProjection {
  code: string;
  x: number;
  y: number;
  opacity: number;
  side: "left" | "right";
}
export interface GlobeController {
  setActive(active: boolean): void;
  setPaused(paused: boolean): void;
  setReduced(reduced: boolean): void;
  setTheme(dark: boolean): void;
  dispose(): void;
}

export function createGlobe(
  container: HTMLElement,
  countries: WorkCountry[],
  onProject: (markers: MarkerProjection[]) => void,
): GlobeController {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  camera.position.z = 3.6;
  const globe = new THREE.Group();
  scene.add(globe);
  const shellGeometry = new THREE.SphereGeometry(0.998, 48, 32);
  const shellMaterial = new THREE.MeshBasicMaterial({ color: 0xfafafa });
  globe.add(new THREE.Mesh(shellGeometry, shellMaterial));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(land.flat(), 3),
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ink: { value: new THREE.Color(0x737373) },
      dotSize: { value: 2.7 * renderer.getPixelRatio() },
    },
    vertexShader: `uniform float dotSize; varying float shade;
      void main() { vec4 p = modelViewMatrix * vec4(position * 1.004, 1.0);
        vec3 n = normalize(mat3(modelViewMatrix) * position);
        shade = .22 + .78 * max(n.z, 0.0);
        gl_Position = projectionMatrix * p; gl_PointSize = dotSize; }`,
    fragmentShader: `uniform vec3 ink; varying float shade;
      void main() { float r = length(gl_PointCoord - .5); if (r > .5) discard;
        gl_FragColor = vec4(ink, (1.0 - smoothstep(.32, .5, r)) * shade); }`,
    transparent: true,
    depthWrite: false,
  });
  globe.add(new THREE.Points(geometry, material));
  const points = countries.map(
    (country) =>
      new THREE.Vector3(...countryPoint(country.latitude, country.longitude)),
  );
  const projections: MarkerProjection[] = countries.map((country) => ({
    code: country.code,
    x: 0,
    y: 0,
    opacity: 0,
    side: "right",
  }));
  const normal = new THREE.Vector3(),
    projected = new THREE.Vector3();
  let disposed = false,
    active = false,
    paused = false,
    reduced = false;
  let frame = 0,
    lastTime = 0,
    yaw = -0.15,
    pitch = 0.08,
    width = 1,
    height = 1;
  let drag: {
    id: number;
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    touch: boolean;
    captured: boolean;
  } | null = null;
  const events = new AbortController();
  const options = { signal: events.signal };

  function draw() {
    if (disposed || !active) return;
    globe.rotation.set(pitch, yaw, 0, "XYZ");
    globe.updateMatrixWorld(true);
    renderer.render(scene, camera);
    points.forEach((point, i) => {
      normal.copy(point).transformDirection(globe.matrixWorld);
      projected
        .copy(point)
        .multiplyScalar(1.015)
        .applyMatrix4(globe.matrixWorld)
        .project(camera);
      const marker = projections[i];
      marker.x = ((projected.x + 1) * width) / 2;
      marker.y = ((1 - projected.y) * height) / 2;
      marker.opacity = markerVisibility(normal.z, camera.position.z);
      marker.side = marker.x > width / 2 ? "left" : "right";
    });
    onProject(projections);
  }
  function stopFrame() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function schedule() {
    if (!disposed && active && !paused && !reduced && !drag && !frame)
      frame = requestAnimationFrame(tick);
  }
  function tick(time: number) {
    frame = 0;
    if (!active || disposed || paused || reduced || drag) return;
    if (lastTime && time - lastTime < 1000 / 30) {
      schedule();
      return;
    }
    const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
    lastTime = time;
    yaw += (elapsed * Math.PI * 2) / 95;
    draw();
    schedule();
  }
  function endDrag() {
    const id = drag?.id;
    drag = null;
    if (id !== undefined && canvas.hasPointerCapture(id))
      canvas.releasePointerCapture(id);
    canvas.style.cursor = "grab";
    lastTime = 0;
    schedule();
  }
  function down(event: PointerEvent) {
    if (!active || event.button !== 0) return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw,
      pitch,
      touch: event.pointerType === "touch",
      captured: false,
    };
    stopFrame();
    if (!drag.touch) {
      canvas.setPointerCapture(event.pointerId);
      drag.captured = true;
      canvas.style.cursor = "grabbing";
    }
  }
  function move(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    // Let vertical gestures scroll the page; claim only intentional horizontal drags.
    if (drag.touch && !drag.captured) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        endDrag();
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
      drag.captured = true;
      canvas.setPointerCapture(event.pointerId);
    }
    yaw = drag.yaw + dx * 0.006;
    pitch = THREE.MathUtils.clamp(
      drag.pitch + (drag.touch ? 0 : dy * 0.004),
      -0.4,
      0.4,
    );
    draw();
  }
  function keys(event: KeyboardEvent) {
    if (event.target !== container.parentElement || !active) return;
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    yaw +=
      event.key === "ArrowLeft" ? -0.12 : event.key === "ArrowRight" ? 0.12 : 0;
    pitch = THREE.MathUtils.clamp(
      pitch +
        (event.key === "ArrowUp"
          ? -0.08
          : event.key === "ArrowDown"
            ? 0.08
            : 0),
      -0.4,
      0.4,
    );
    draw();
  }
  function resize() {
    const box = container.getBoundingClientRect();
    if (!box.width || !box.height) return;
    width = box.width;
    height = box.height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  canvas.addEventListener("pointerdown", down, options);
  canvas.addEventListener("pointermove", move, options);
  canvas.addEventListener("pointerup", endDrag, options);
  canvas.addEventListener("pointercancel", endDrag, options);
  canvas.addEventListener("lostpointercapture", endDrag, options);
  container.parentElement?.addEventListener("keydown", keys, options);
  resize();
  return {
    setActive(value) {
      active = value;
      stopFrame();
      if (!active) endDrag();
      else {
        draw();
        schedule();
      }
    },
    setPaused(value) {
      paused = value;
      stopFrame();
      schedule();
    },
    setReduced(value) {
      reduced = value;
      stopFrame();
      draw();
      schedule();
    },
    setTheme(dark) {
      shellMaterial.color.set(dark ? 0x0c0c0c : 0xfafafa);
      material.uniforms.ink.value.set(dark ? 0xc4c4c4 : 0x737373);
      draw();
    },
    dispose() {
      disposed = true;
      stopFrame();
      endDrag();
      events.abort();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
