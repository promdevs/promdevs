import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export type ApolloController = {
  setActive: (active: boolean) => void;
  setPaused: (paused: boolean) => void;
  setDark: (dark: boolean) => void;
  dispose: () => void;
};

export async function createApolloScene(
  host: HTMLElement,
  onFailure: () => void,
): Promise<ApolloController> {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(3.35, 3.25, 6.2);
  const target = new THREE.Vector3(0.25, 1.88, 0.15);
  camera.lookAt(target);
  const root = new THREE.Group();
  root.rotation.y = -0.18;
  scene.add(root);
  const marble = new THREE.MeshPhysicalMaterial({
    color: 0xe7e0d1,
    roughness: 0.66,
    metalness: 0.02,
    clearcoat: 0.12,
  });
  const stone = new THREE.MeshStandardMaterial({
    color: 0x303432,
    roughness: 0.72,
    metalness: 0.2,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x707777,
    metalness: 0.7,
    roughness: 0.35,
  });
  const keyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7d5ce,
    roughness: 0.55,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    emissive: 0x2563eb,
    emissiveIntensity: 0.25,
  });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: number[],
    scale: number[],
    parent: THREE.Object3D = root,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    parent.add(mesh);
    return mesh;
  };
  const ellipsoid = (p: number[], s: number[], parent: THREE.Object3D = root) =>
    add(sphere, marble, p, s, parent);
  const bone = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius: number,
    parent: THREE.Object3D = root,
  ) => {
    const midpoint = a.clone().add(b).multiplyScalar(0.5);
    const mesh = add(
      new THREE.CapsuleGeometry(
        radius,
        Math.max(0.001, a.distanceTo(b) - radius * 2),
        5,
        12,
      ),
      marble,
      midpoint.toArray(),
      [1, 1, 1],
      parent,
    );
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return mesh;
  };
  const hemi = new THREE.HemisphereLight(0xf4f4ff, 0x5f594e, 2.4);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xfff2dd, 4.2);
  keyLight.position.set(-3, 5, 4);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0xd8e4ff, 2.4);
  rim.position.set(3, 3, -2);
  scene.add(rim);
  const screenLight = new THREE.PointLight(0x507cff, 1.4, 3);
  screenLight.position.set(0, 1.45, 1.25);
  scene.add(screenLight);

  const sculptureMaterial = marble.clone();
  const sculptureTime = { value: 0 };
  sculptureMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.sculptureTime = sculptureTime;
    shader.vertexShader =
      "uniform float sculptureTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float neckWeight = smoothstep(-0.25, 0.35, position.y);
      float nod = sin(sculptureTime * 0.65) * 0.006 * neckWeight;
      vec3 neckPoint = transformed - vec3(0.15, 0.0, -0.2);
      neckPoint.yz = mat2(cos(nod), sin(nod), -sin(nod), cos(nod)) * neckPoint.yz;
      transformed = neckPoint + vec3(0.15, 0.0, -0.2);
    `,
    );
  };
  try {
    const asset = await new GLTFLoader().loadAsync("/models/apollo.glb");
    asset.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach((material) => material.dispose());
      object.material = sculptureMaterial;
    });
    const sculpture = asset.scene.getObjectByName("ApolloSculpture");
    if (!sculpture)
      throw new Error("Apollo asset is missing sculpture geometry");
    sculpture.position.set(0, 2.19, -0.2);
    root.add(sculpture);
  } catch (error) {
    renderer.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    [marble, sculptureMaterial, stone, metal, keyMaterial, blue].forEach(
      (material) => material.dispose(),
    );
    throw error;
  }

  // Thin workstation, with an open sightline to the fingers from the camera.
  add(cube, stone, [0, 0.82, 0.58], [1.9, 0.09, 1.43]);
  add(cube, metal, [0, 0.765, 0.58], [1.82, 0.025, 1.36]);
  add(cube, metal, [0, 0.905, 0.79], [1.05, 0.07, 0.47]);
  const keys: THREE.Mesh[][] = [];
  for (let row = 0; row < 4; row++) {
    keys[row] = [];
    for (let col = 0; col < 12; col++) {
      keys[row][col] = add(
        cube,
        row === 0 && col === 0 ? blue : keyMaterial,
        [(col - 5.5) * 0.082, 0.953, 0.63 + row * 0.102],
        [0.073, 0.035, 0.084],
      );
    }
  }
  keys[3][5].scale.x = 0.32;
  keys[3][5].position.x = 0;
  [4, 6, 7].forEach((col) => {
    keys[3][col].visible = false;
  });
  // Offset the screen so it never hides the typing animation.
  const monitor = new THREE.Group();
  monitor.position.set(-0.77, 0.87, 1.07);
  monitor.rotation.y = 0.25;
  root.add(monitor);
  add(cube, metal, [0, 0.04, 0], [0.45, 0.045, 0.28], monitor);
  add(cube, metal, [0, 0.34, 0.015], [0.055, 0.59, 0.06], monitor);
  add(cube, stone, [0, 0.75, 0.015], [0.85, 0.56, 0.045], monitor);
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 768;
  screenCanvas.height = 480;
  const ctx = screenCanvas.getContext("2d")!;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    side: THREE.DoubleSide,
  });
  // Apollo sees the front, while the camera sees a second, readable face of the thin display.
  add(
    new THREE.PlaneGeometry(0.79, 0.5),
    screenMaterial,
    [0, 0.75, 0.041],
    [1, 1, 1],
    monitor,
  );
  add(
    new THREE.PlaneGeometry(0.79, 0.5),
    screenMaterial,
    [0, 0.75, -0.011],
    [-1, 1, 1],
    monitor,
  );
  const drawScreen = (time: number) => {
    ctx.fillStyle = "#111713";
    ctx.fillRect(0, 0, 768, 480);
    ctx.fillStyle = "#65766f";
    ctx.font = "18px monospace";
    ctx.fillText("PROMDEVS / STUDIO", 35, 40);
    ctx.fillStyle = "#293a31";
    ctx.fillRect(35, 60, 698, 2);
    if (time < 2.8) {
      ctx.font = "bold 78px sans-serif";
      ctx.fillStyle = "#f2f0e9";
      ctx.fillText("prom", 105, 255);
      ctx.fillStyle = "#2563eb";
      ctx.fillText("devs", 300, 255);
      ctx.font = "18px monospace";
      ctx.fillStyle = "#a7b6ab";
      ctx.fillText("GOOD IDEAS. EXCEPTIONAL EXECUTION.", 107, 305);
    } else {
      const lines = [
        "const idea = await imagine();",
        "",
        "const product = build({",
        '  design: "considered",',
        '  details: "exceptional",',
        "  ambition: Infinity,",
        "});",
        "",
        "await product.launch();",
      ];
      let remaining = Math.floor((time - 2.8) * 17) % 205;
      ctx.font = "23px monospace";
      lines.forEach((line, i) => {
        ctx.fillStyle = "#506055";
        ctx.fillText(String(i + 1).padStart(2, "0"), 30, 105 + i * 36);
        ctx.fillStyle = i === 8 ? "#749bff" : "#d9e4d9";
        const text = line.slice(0, Math.max(0, remaining));
        ctx.fillText(text, 85, 105 + i * 36);
        remaining -= line.length;
      });
    }
    screenTexture.needsUpdate = true;
  };
  drawScreen(0);

  type Finger = { pivots: THREE.Group[]; key: THREE.Mesh; phase: number };
  const fingers: Finger[] = [];
  for (const side of [-1, 1]) {
    const shoulder =
      side < 0
        ? new THREE.Vector3(-0.24, 1.93, -0.21)
        : new THREE.Vector3(1.11, 1.67, -0.52);
    const elbow =
      side < 0
        ? new THREE.Vector3(-0.39, 1.27, -0.03)
        : new THREE.Vector3(0.93, 1.2, -0.01);
    const wrist = new THREE.Vector3(side * 0.285, 1.049, 0.5);
    const armPath = new THREE.CatmullRomCurve3([
      shoulder,
      shoulder.clone().lerp(elbow, 0.55),
      elbow,
      elbow.clone().lerp(wrist, 0.55),
      wrist,
    ]);
    const armGeometry = new THREE.TubeGeometry(armPath, 36, 1, 16, false);
    const armPositions = armGeometry.getAttribute("position");
    for (let ring = 0; ring <= 36; ring++) {
      const t = ring / 36;
      const center = armPath.getPointAt(t);
      const radius =
        t < 0.48
          ? THREE.MathUtils.lerp(0.15, 0.105, t / 0.48)
          : THREE.MathUtils.lerp(0.105, 0.061, (t - 0.48) / 0.52);
      for (let j = 0; j <= 16; j++) {
        const i = ring * 17 + j;
        const point = new THREE.Vector3()
          .fromBufferAttribute(armPositions, i)
          .sub(center)
          .multiplyScalar(radius)
          .add(center);
        armPositions.setXYZ(i, point.x, point.y, point.z);
      }
    }
    armGeometry.computeVertexNormals();
    add(armGeometry, marble, [0, 0, 0], [1, 1, 1]);
    ellipsoid(
      shoulder.toArray(),
      side < 0 ? [0.155, 0.175, 0.16] : [0.2, 0.25, 0.22],
    );
    ellipsoid(wrist.toArray(), [0.066, 0.058, 0.071]);
    const palm = new THREE.Group();
    palm.position.copy(wrist);
    root.add(palm);
    ellipsoid([0, -0.008, 0.1], [0.114, 0.05, 0.14], palm);
    for (let digit = 0; digit < 4; digit++) {
      const x = (digit - 1.5) * 0.053;
      const base = new THREE.Group();
      base.position.set(x, 0, 0.187);
      palm.add(base);
      const lengths = [
        0.077,
        0.055,
        digit === 0 || digit === 3 ? 0.041 : 0.054,
      ];
      const pivots = [base];
      let parent = base;
      lengths.forEach((length, joint) => {
        if (joint) {
          const next = new THREE.Group();
          next.position.z = lengths[joint - 1];
          parent.add(next);
          parent = next;
          pivots.push(next);
        }
        bone(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, length),
          0.024 - joint * 0.003,
          parent,
        );
        ellipsoid([0, 0, 0], [0.024 - joint * 0.003, 0.021, 0.024], parent);
      });
      const worldX = wrist.x + x;
      const col = Math.min(11, Math.max(0, Math.round(worldX / 0.082 + 5.5)));
      fingers.push({ pivots, key: keys[2][col], phase: fingers.length });
    }
    // Opposed thumb curls toward the space-bar edge of the keyboard.
    const thumb = new THREE.Group();
    thumb.position.set(-side * 0.09, -0.015, 0.05);
    thumb.rotation.y = -side * 0.65;
    palm.add(thumb);
    bone(new THREE.Vector3(), new THREE.Vector3(0, -0.025, 0.12), 0.03, thumb);
    bone(
      new THREE.Vector3(0, -0.025, 0.12),
      new THREE.Vector3(0, -0.035, 0.18),
      0.024,
      thumb,
    );
  }

  // Soft contact shadow without a full-screen post-processing pass.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext("2d")!;
  const gradient = shadowCtx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.32)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  shadowCtx.fillStyle = gradient;
  shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  const shadow = add(
    new THREE.PlaneGeometry(4, 3),
    shadowMaterial,
    [0.25, 0.6, 0.35],
    [1, 1, 1],
  );
  shadow.rotation.x = -Math.PI / 2;

  let active = false,
    paused = false,
    disposed = false,
    raf = 0,
    elapsed = 0,
    previous = 0,
    screenTick = -1;
  const pointer = new THREE.Vector2();
  const render = () => renderer.render(scene, camera);
  const frame = (now: number) => {
    if (!active || paused || disposed) return;
    elapsed += Math.min((now - previous) / 1000 || 0, 0.04);
    previous = now;
    keys.flat().forEach((key) => {
      key.position.y = 0.953;
    });
    // One contact event drives both the finger curl and its corresponding key travel.
    const sequence = [0, 5, 2, 7, 1, 4, 3, 6];
    const beat = elapsed * 6.5;
    const index = sequence[Math.floor(beat) % sequence.length];
    const press = Math.pow(Math.sin((beat % 1) * Math.PI), 2);
    for (const finger of fingers) {
      const contact = finger.phase === index ? press : 0;
      finger.pivots[0].rotation.x = -0.18 + contact * 0.22;
      finger.pivots[1].rotation.x = 0.43 + contact * 0.1;
      finger.pivots[2].rotation.x = 0.38 + contact * 0.08;
      finger.key.position.y = Math.min(
        finger.key.position.y,
        0.953 - contact * 0.014,
      );
    }
    sculptureTime.value = elapsed;
    root.rotation.y += (-0.18 + pointer.x * 0.09 - root.rotation.y) * 0.045;
    camera.position.y += (3.25 + pointer.y * 0.1 - camera.position.y) * 0.04;
    camera.lookAt(target);
    if (Math.floor(elapsed * 8) !== screenTick) {
      screenTick = Math.floor(elapsed * 8);
      drawScreen(elapsed);
    }
    render();
    raf = requestAnimationFrame(frame);
  };
  const sync = () => {
    cancelAnimationFrame(raf);
    previous = performance.now();
    if (active && !paused && !disposed) raf = requestAnimationFrame(frame);
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  const pointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const rect = host.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      ((event.clientY - rect.top) / rect.height) * 2 - 1,
    );
  };
  const pointerLeave = () => pointer.set(0, 0);
  const contextLost = (event: Event) => {
    event.preventDefault();
    active = false;
    sync();
    onFailure();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  host.addEventListener("pointermove", pointerMove);
  host.addEventListener("pointerleave", pointerLeave);
  host.appendChild(renderer.domElement);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
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
      hemi.intensity = dark ? 1.7 : 2.4;
      keyLight.intensity = dark ? 3.6 : 4.2;
      rim.intensity = dark ? 3.3 : 2.4;
      screenLight.intensity = dark ? 2 : 1.4;
      render();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener("pointermove", pointerMove);
      host.removeEventListener("pointerleave", pointerLeave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      screenTexture.dispose();
      shadowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
