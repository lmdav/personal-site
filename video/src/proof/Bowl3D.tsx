// v4 proof in real 3D: the bowl pulls apart into labeled layers and reassembles.
// Everything is modeled in Three.js and lit by one studio setup so it reads as one dish.
import { ContactShadows, Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { rng } from "../geo";
import { MONO, SERIF } from "../theme";

export const BOWL3D_FRAMES = 390;
const BG = "#F3ECDF";

/* ------------------------------------------------------------------ */
/* Textures, painted on a canvas so they are deterministic             */
/* ------------------------------------------------------------------ */

function paint(size: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function blotches(g: CanvasRenderingContext2D, r: () => number, n: number, colors: string[], min: number, max: number, size: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.globalAlpha = 0.25 + r() * 0.5;
    g.beginPath();
    g.ellipse(r() * size, r() * size, min + r() * (max - min), min + r() * (max - min), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

const pattyTexture = () =>
  paint(512, (g, r) => {
    g.fillStyle = "#7A4E33";
    g.fillRect(0, 0, 512, 512);
    blotches(g, r, 900, ["#5A3622", "#8C5C3D", "#4A2C1B", "#9A6A47"], 2, 9, 512);
    // the darker, crisp crust toward the edge
    const grad = g.createRadialGradient(256, 256, 120, 256, 256, 256);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(52,28,14,0.6)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
  }, 11);

const potatoTexture = () =>
  paint(512, (g, r) => {
    g.fillStyle = "#D9A03C";
    g.fillRect(0, 0, 512, 512);
    blotches(g, r, 600, ["#F0C766", "#B9771F", "#8E5216", "#F4D98E"], 3, 18, 512);
    blotches(g, r, 160, ["#7A4A1A", "#5E3612"], 2, 6, 512);
  }, 12);

const leafTexture = () =>
  paint(512, (g, r) => {
    g.clearRect(0, 0, 512, 512);
    // leaf outline with a ruffled edge, transparent outside
    g.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = (i / 80) * Math.PI * 2;
      const rr = 1 + 0.035 * Math.sin(t * 11 + 1) + 0.02 * (r() - 0.5);
      const x = 256 + Math.cos(t) * 240 * rr;
      const y = 256 + Math.sin(t) * 215 * rr * (1 - 0.15 * Math.cos(t));
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    const grad = g.createLinearGradient(0, 41, 0, 471);
    grad.addColorStop(0, "#3F7A2A");
    grad.addColorStop(0.42, "#7DB24A");
    grad.addColorStop(0.5, "#E6F0C8");
    grad.addColorStop(0.58, "#7DB24A");
    grad.addColorStop(1, "#3F7A2A");
    g.fillStyle = grad;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = "rgba(230,240,200,0.65)";
    for (let k = -6; k <= 6; k++) {
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(256 + k * 34, 256);
      g.quadraticCurveTo(256 + k * 34 + 30, 256 + (k % 2 ? -50 : 50), 256 + k * 34 + 60, 256 + (k % 2 ? -110 : 110));
      g.stroke();
    }
    blotches(g, r, 300, ["#5E9A35", "#9BC566", "#3A6E24"], 3, 12, 512);
    g.restore();
  }, 13);

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

/** A cylinder with a lumpy, lacy edge: the smash patty. */
function pattyGeometry(radius: number, height: number, seed: number) {
  const r = rng(seed);
  const geo = new THREE.CylinderGeometry(radius, radius, height, 160, 2, false);
  const noise = Array.from({ length: 160 }, () => r());
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    if (d < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 160) % 160;
    const lace = 1 + 0.05 * Math.sin(a * 7) + 0.07 * (noise[k] - 0.5) + (noise[k] > 0.8 ? 0.06 : 0);
    const s = (d / radius) * lace;
    pos.setX(i, (x / d) * radius * s);
    pos.setZ(i, (z / d) * radius * s);
    if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + 0.006 * Math.sin(x * 40) * Math.cos(z * 37));
  }
  geo.computeVertexNormals();
  return geo;
}

/** A smashed potato: a flattened, craggy sphere. */
function potatoGeometry(radius: number, seed: number) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(radius, 5);
  const pos = geo.attributes.position;
  const bumps = Array.from({ length: 12 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    let crag = 0;
    for (const b of bumps) crag += Math.max(0, n.dot(b)) ** 5 * 0.3;
    v.multiplyScalar(1 + crag + 0.04 * Math.sin(n.x * 30) * Math.cos(n.z * 27));
    v.y *= 0.5;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A square slice of cheese that drapes over the edge of a patty. */
function cheeseGeometry(size: number, pattyRadius: number) {
  const geo = new THREE.PlaneGeometry(size, size, 40, 40);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(0.6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const over = d - pattyRadius * 0.92;
    let y = 0.004 * Math.sin(x * 30) * Math.cos(z * 24);
    if (over > 0) {
      y -= over * 1.1 + over * over * 6;
      const pull = Math.min(over * 0.5, 0.03);
      pos.setX(i, x - (x / d) * pull);
      pos.setZ(i, z - (z / d) * pull);
    }
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A leaf: a subdivided plane with an arch, a curl, and a ruffled edge. */
function leafGeometry(seed: number) {
  const r = rng(seed);
  const geo = new THREE.PlaneGeometry(0.62, 0.3, 30, 12);
  const pos = geo.attributes.position;
  const ph = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = 0.05 * Math.sin(Math.PI * (x / 0.62 + 0.5)) + 0.5 * y * y + 0.018 * Math.sin(x * 30 + ph) * (Math.abs(y) / 0.15) ** 2;
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

/** The bowl, turned on a lathe: inner wall, rim, outer wall, and foot. */
function bowlGeometry() {
  const pts: THREE.Vector2[] = [];
  const add = (x: number, y: number) => pts.push(new THREE.Vector2(x, y));
  add(0.001, 0.08);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    add(0.34 + 0.6 * Math.sin((t * Math.PI) / 2) ** 1.3, 0.09 + 0.63 * t ** 1.6);
  }
  add(0.955, 0.738);
  add(0.975, 0.745);
  add(0.995, 0.735);
  for (let i = 24; i >= 0; i--) {
    const t = i / 24;
    add(0.42 + 0.58 * Math.sin((t * Math.PI) / 2) ** 1.25, 0.03 + 0.7 * t ** 1.5);
  }
  add(0.42, 0.0);
  add(0.36, 0.0);
  add(0.35, 0.03);
  add(0.001, 0.03);
  return new THREE.LatheGeometry(pts, 160);
}

/* ------------------------------------------------------------------ */
/* Scene pieces                                                        */
/* ------------------------------------------------------------------ */

function Studio() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    return () => env.dispose();
  }, [gl, scene]);
  return (
    <>
      <color attach="background" args={[BG]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[2.5, 5, 3]} intensity={2.2} color="#FFF1DE" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#FFE9D2" />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <shadowMaterial opacity={0.12} color="#4A3523" />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} scale={4} blur={2.4} opacity={0.55} far={1.2} resolution={1024} color="#4A3523" />
    </>
  );
}

function Bowl() {
  const geo = useMemo(bowlGeometry, []);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial color="#E9D9BD" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.25} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Romaine() {
  const tex = useMemo(leafTexture, []);
  const leaves = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 16 }, (_, i) => {
      const a = Math.PI * (0.55 + 0.9 * r());
      const d = 0.15 + 0.45 * Math.sqrt(r());
      return {
        geo: leafGeometry(i + 3),
        pos: [Math.cos(a) * d, 0.02 + i * 0.008, Math.sin(a) * d * 1.1] as [number, number, number],
        rot: [-Math.PI / 2 + (r() - 0.5) * 0.35, (r() - 0.5) * 0.25, r() * Math.PI] as [number, number, number],
      };
    });
  }, []);
  return (
    <group>
      {leaves.map((l, i) => (
        <mesh key={i} geometry={l.geo} position={l.pos} rotation={l.rot} castShadow receiveShadow>
          <meshStandardMaterial map={tex} alphaTest={0.4} side={THREE.DoubleSide} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function Toppings() {
  const r = rng(9);
  const tomatoes = Array.from({ length: 9 }, () => [-0.42 + (r() - 0.5) * 0.45, 0.07, (r() - 0.5) * 0.75, r() * 3] as const);
  const onions = Array.from({ length: 10 }, () => [-0.4 + (r() - 0.5) * 0.5, 0.06, (r() - 0.5) * 0.7, r() * 3] as const);
  const pickles = Array.from({ length: 5 }, () => [-0.35 + (r() - 0.5) * 0.4, 0.08, (r() - 0.5) * 0.65, (r() - 0.5) * 0.5] as const);
  return (
    <group>
      {tomatoes.map(([x, y, z, a], i) => (
        <mesh key={`t${i}`} position={[x, y, z]} rotation={[a, a * 0.7, 0]} castShadow>
          <boxGeometry args={[0.09, 0.085, 0.09]} />
          <meshPhysicalMaterial color="#D3402A" roughness={0.25} clearcoat={0.8} />
        </mesh>
      ))}
      {onions.map(([x, y, z, a], i) => (
        <mesh key={`o${i}`} position={[x, y, z]} rotation={[a, a, a]} castShadow>
          <boxGeometry args={[0.04, 0.035, 0.04]} />
          <meshPhysicalMaterial color="#F3ECDC" roughness={0.3} transmission={0.25} thickness={0.05} />
        </mesh>
      ))}
      {pickles.map(([x, y, z, a], i) => (
        <mesh key={`p${i}`} position={[x, y, z]} rotation={[a, 0, a]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.016, 32]} />
          <meshPhysicalMaterial color="#8DA346" roughness={0.3} clearcoat={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Potatoes() {
  const tex = useMemo(potatoTexture, []);
  const spuds = useMemo(() => [0, 1, 2].map((i) => potatoGeometry(0.2, 20 + i)), []);
  const at: [number, number, number][] = [[0.35, 0, 0.42], [0.62, 0.02, 0.12], [0.2, 0.01, 0.1]];
  return (
    <group>
      {spuds.map((geo, i) => (
        <mesh key={i} geometry={geo} position={at[i]} rotation={[0.1 * i, i, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={1.5} roughness={0.55} />
        </mesh>
      ))}
    </group>
  );
}

function Patties({ melt }: { melt: number }) {
  const tex = useMemo(pattyTexture, []);
  const patties = useMemo(() => [pattyGeometry(0.29, 0.05, 31), pattyGeometry(0.28, 0.05, 32)], []);
  const cheese = useMemo(() => cheeseGeometry(0.4, 0.28), []);
  const at: [number, number, number][] = [[0.28, 0.02, -0.32], [0.5, 0.06, 0.0]];
  return (
    <group>
      {patties.map((geo, i) => (
        <group key={i} position={at[i]} rotation={[0, i * 1.2, 0]}>
          <mesh geometry={geo} castShadow receiveShadow>
            <meshStandardMaterial map={tex} bumpMap={tex} bumpScale={2.5} roughness={0.5} />
          </mesh>
          <mesh geometry={cheese} position={[0, 0.04, 0]} scale={[1, melt, 1]} castShadow>
            <meshPhysicalMaterial color="#F2B33D" roughness={0.32} clearcoat={0.4} emissive="#3A2200" emissiveIntensity={0.15} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Mushrooms() {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.06, 0);
    s.quadraticCurveTo(-0.065, 0.065, 0, 0.068);
    s.quadraticCurveTo(0.065, 0.065, 0.06, 0);
    s.lineTo(0.02, 0);
    s.lineTo(0.017, -0.05);
    s.lineTo(-0.017, -0.05);
    s.lineTo(-0.02, 0);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2 });
  }, []);
  const r = rng(5);
  const slices = Array.from({ length: 7 }, () => [0.12 + r() * 0.5, 0.05, -0.5 + r() * 0.8, r() * 6] as const);
  return (
    <group>
      {slices.map(([x, y, z, a], i) => (
        <mesh key={i} geometry={shape} position={[x, y, z]} rotation={[-Math.PI / 2, 0, a]} scale={[1.25, 1.25, 0.6]} castShadow>
          <meshStandardMaterial color="#B08A63" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Sauce({ progress }: { progress: number }) {
  const geo = useMemo(() => {
    const r = rng(77);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 9; i++) {
      const t = i / 9;
      pts.push(new THREE.Vector3(-0.55 + 1.15 * t + (r() - 0.5) * 0.05, 0.015 * Math.sin(i * 1.7), (i % 2 ? -0.22 : 0.24) * (1 - 0.35 * Math.abs(t - 0.5)) + (r() - 0.5) * 0.06));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.012, 12, false);
  }, []);
  useLayoutEffect(() => {
    geo.setDrawRange(0, Math.floor((geo.index?.count ?? 0) * progress));
  }, [geo, progress]);
  return (
    <mesh geometry={geo} castShadow>
      <meshPhysicalMaterial color="#F0C29C" roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Choreography                                                        */
/* ------------------------------------------------------------------ */

type LayerId = "romaine" | "toppings" | "potatoes" | "patties" | "mushrooms" | "sauce";
// Build order, bottom to top. rest: height inside the bowl; lift: height when pulled apart.
const LAYERS: { id: LayerId; rest: number; lift: number; label: string; amount: string }[] = [
  { id: "romaine", rest: 0.36, lift: 0.85, label: "Romaine", amount: "2 cups, chopped" },
  { id: "toppings", rest: 0.46, lift: 1.22, label: "Tomato, onion, pickles", amount: "the cold side" },
  { id: "potatoes", rest: 0.42, lift: 1.6, label: "Crispy potatoes", amount: "8 oz, smashed" },
  { id: "patties", rest: 0.5, lift: 1.98, label: "Smash patties", amount: "6 oz, cheese melted on" },
  { id: "mushrooms", rest: 0.6, lift: 2.32, label: "Mushrooms", amount: "1 cup, browned" },
  { id: "sauce", rest: 0.66, lift: 2.62, label: "Special sauce", amount: "Greek yogurt base" },
];

function CameraRig({ apart }: { apart: number }) {
  const { camera } = useThree();
  const frame = useCurrentFrame();
  const orbit = -0.35 + (frame / BOWL3D_FRAMES) * 0.7;
  const dist = 3.2 + apart * 2.6;
  const height = 2.15 + apart * 0.9;
  const target = new THREE.Vector3(0.35 * apart, 0.45 + apart * 0.85, 0);
  camera.position.set(Math.sin(orbit) * dist, height, Math.cos(orbit) * dist);
  camera.lookAt(target);
  return null;
}

function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = LAYERS.length;
  const apartOf = (i: number) => {
    const up = interpolate(frame, [50 + (n - 1 - i) * 5, 105 + (n - 1 - i) * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.2)) });
    const down = spring({ frame: frame - (215 + i * 7), fps, config: { damping: 14, stiffness: 100, mass: 0.9 } });
    return Math.max(0, up * (1 - down));
  };
  const overall = interpolate(frame, [45, 110, 210, 280], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const labels = interpolate(frame, [115, 140, 200, 215], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const melt = interpolate(frame, [270, 300], [0.25, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sauce = frame < 60 ? 1 : interpolate(frame, [300, 335], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });

  const content: Record<LayerId, React.ReactNode> = {
    romaine: <Romaine />,
    toppings: <Toppings />,
    potatoes: <Potatoes />,
    patties: <Patties melt={frame < 60 ? 1 : melt} />,
    mushrooms: <Mushrooms />,
    sauce: <Sauce progress={sauce} />,
  };

  return (
    <>
      <Studio />
      <CameraRig apart={overall} />
      <group position={[0, -overall * 0.25, 0]}>
        <Bowl />
      </group>
      {LAYERS.map((layer, i) => {
        const a = apartOf(i);
        const y = layer.rest + (layer.lift - layer.rest) * a + Math.sin(frame / 15 + i) * 0.012 * a;
        return (
          <group key={layer.id} position={[0, y, 0]} rotation={[0, a * 0.15 * (i % 2 ? 1 : -1), 0]}>
            {content[layer.id]}
            {labels > 0 && (
              <Html position={[1.15, 0.05, 0]} style={{ opacity: labels, whiteSpace: "nowrap", pointerEvents: "none" }}>
                <div style={{ transform: `translateX(${(1 - labels) * 20}px)` }}>
                  <div style={{ fontFamily: SERIF, fontSize: 40, color: "#2B231B", lineHeight: 1 }}>{layer.label}</div>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: "#7A6A58", marginTop: 6 }}>{layer.amount}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

export function Bowl3D() {
  const frame = useCurrentFrame();
  const title = interpolate(frame, [335, 360], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <ThreeCanvas width={1920} height={1080} shadows camera={{ fov: 30, position: [0, 2.3, 3.6], near: 0.1, far: 50 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <Scene />
      </ThreeCanvas>
      <div style={{ position: "absolute", left: 120, top: 100, opacity: title }}>
        <div style={{ fontFamily: SERIF, fontSize: 88, color: "#2B231B", lineHeight: 1 }}>Smash Burger Bowl</div>
        <div style={{ fontFamily: MONO, fontSize: 24, color: "#7A6A58", letterSpacing: 2, marginTop: 14 }}>57 G PROTEIN · 30 MIN · LMDAV.COM/RECIPES</div>
      </div>
    </AbsoluteFill>
  );
}
