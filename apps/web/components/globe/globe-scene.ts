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
  onMarker: (code: string | null, pin?: boolean) => void = () => {},
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
  const dots = countries.flatMap((country, countryIndex) =>
    country.markers.map(([latitude, longitude]) => ({
      countryIndex,
      point: new THREE.Vector3(...countryPoint(latitude, longitude)),
      x: 0,
      y: 0,
      opacity: 0,
    })),
  );
  const anchors = countries.map((_, i) =>
    dots.findIndex((dot) => dot.countryIndex === i),
  );
  const markerGeometry = new THREE.BufferGeometry();
  markerGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      dots.flatMap((dot) => dot.point.toArray()),
      3,
    ),
  );
  const markerMaterial = new THREE.ShaderMaterial({
    uniforms: { dotSize: { value: 4.5 * renderer.getPixelRatio() } },
    vertexShader: `uniform float dotSize; varying float visibility;
      void main() { vec3 n = normalize(mat3(modelViewMatrix) * position);
        visibility = clamp((n.z - 0.30278) / .16, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position * 1.015, 1.0);
        gl_PointSize = dotSize; }`,
    fragmentShader: `varying float visibility;
      void main() { float r = length(gl_PointCoord - .5); if (r > .5) discard;
        gl_FragColor = vec4(.1451, .3882, .9216, (1.0 - smoothstep(.32, .5, r)) * visibility); }`,
    transparent: true,
    depthWrite: false,
  });
  globe.add(new THREE.Points(markerGeometry, markerMaterial));
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
    yaw = 0.9,
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
  let highlighted: string | null = null;

  function draw() {
    if (disposed || !active) return;
    globe.rotation.set(pitch, yaw, 0, "XYZ");
    globe.updateMatrixWorld(true);
    renderer.render(scene, camera);
    dots.forEach((dot) => {
      normal.copy(dot.point).transformDirection(globe.matrixWorld);
      projected
        .copy(dot.point)
        .multiplyScalar(1.015)
        .applyMatrix4(globe.matrixWorld)
        .project(camera);
      dot.x = ((projected.x + 1) * width) / 2;
      dot.y = ((1 - projected.y) * height) / 2;
      dot.opacity = markerVisibility(normal.z, camera.position.z);
    });
    projections.forEach((marker, i) => {
      const dot = dots[anchors[i]];
      marker.x = dot.x;
      marker.y = dot.y;
      marker.opacity = dot.opacity;
      marker.side = marker.x > width / 2 ? "left" : "right";
    });
    onProject(projections);
  }
  function pick(event: PointerEvent, pin = false) {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left,
      y = event.clientY - box.top;
    let closest = -1,
      distance = event.pointerType === "touch" ? 22 : 12;
    dots.forEach((dot, i) => {
      const d = Math.hypot(dot.x - x, dot.y - y);
      if (dot.opacity > 0.1 && d < distance) {
        closest = i;
        distance = d;
      }
    });
    const code =
      closest < 0 ? null : countries[dots[closest].countryIndex].code;
    if (closest >= 0) {
      anchors[dots[closest].countryIndex] = closest;
      draw();
    }
    if (highlighted !== code || pin) {
      highlighted = code;
      onMarker(code, pin);
    }
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
    if (!drag) {
      if (event.pointerType !== "touch") pick(event);
      return;
    }
    if (drag.id !== event.pointerId) return;
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
    markerMaterial.uniforms.dotSize.value =
      (width < 400 ? 3 : 4.5) * renderer.getPixelRatio();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  canvas.addEventListener("pointerdown", down, options);
  canvas.addEventListener("pointermove", move, options);
  canvas.addEventListener(
    "pointerup",
    (event) => {
      const tap =
        drag && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6;
      endDrag();
      if (tap) pick(event, true);
    },
    options,
  );
  canvas.addEventListener(
    "pointerleave",
    () => {
      highlighted = null;
      onMarker(null);
    },
    options,
  );
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
      markerGeometry.dispose();
      markerMaterial.dispose();
      shellGeometry.dispose();
      shellMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
