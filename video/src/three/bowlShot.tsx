// The finished bowl as a product shot, shared by the proof and the how-to videos: any
// recipe's layers from its build file, their resting and pulled-apart poses and the
// recorded drop from its physics bake (tools/bake-drop.mjs), the orbiting camera, the sauce
// drizzle, the topping, and the labels with leader lines.
import { Html, Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { rng } from "../geo";
import { MONO, SERIF } from "../theme";
import { Piece, pieceObject, useKit, type Kind } from "./ingredients";

// webpack's require.context, which Remotion's bundler provides.
type Context = { keys(): string[]; (key: string): unknown };
declare const require: { context(dir: string, deep: boolean, match: RegExp): Context };
const builds = require.context("../recipes", false, /\.build\.json$/);
const drops = require.context("../data", false, /\.drop\.json$/);

type Pose = number[]; // x, y, z, then rotation as a quaternion
type Item = { layer: number; kind: Kind; variant: number; release: number };
/** The line the sauce follows. window: how many points either side smooth it over gaps. */
type Drizzle = { color: string; from: number; span: number; center: number; amp: number; waves: number; window?: number };
export type Build = {
  bowl: { profile: number[][]; segments: number; rim: number };
  layers: { id: string; label: string; detail: string; lift: number }[];
  sauce: { label: string; detail: string; lift: number; drizzle: Drizzle };
  /** Seeds scattered over the finished food, within this radius. */
  topping?: { food: "sesame"; count: number; radius: number };
  kinds: Record<string, { reach?: number; lathe?: number[][] }>;
};

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export type PiecePose = { p: [number, number, number]; q: [number, number, number, number] };
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion();

function makeBowl(slug: string, build: Build, drop: { frames: unknown[]; items: unknown[] }) {
  const samples = drop.frames as Pose[][];
  const apartPose = samples[0];
  const restPose = samples[samples.length - 1];
  const items = drop.items as Item[];
  const LAYERS = build.layers.length;
  // Each layer's middle, its right edge, and its label height, while pulled apart. Labels
  // keep at least 8.5 cm apart, working up from the bottom.
  const layerBox = build.layers.map((_, li) => {
    const ps = apartPose.filter((_, i) => items[i].layer === li);
    const reach = Math.max(...items.filter((it) => it.layer === li).map((it) => build.kinds[it.kind].reach ?? 0));
    const avg = (k: number) => ps.reduce((s, p) => s + p[k], 0) / ps.length;
    return { center: [avg(0), avg(1), avg(2)] as const, right: Math.max(...ps.map((p) => p[0])) + 0.035 + reach, label: avg(1) };
  });
  layerBox.forEach((box, li) => {
    if (li > 0) box.label = Math.max(box.label, layerBox[li - 1].label + 0.085);
  });
  return {
    slug,
    build,
    samples,
    restPose,
    items,
    LAYERS,
    layerBox,
    sauceLabelY: Math.max(build.sauce.lift + 0.01, layerBox[LAYERS - 1].label + 0.085),
    /** Piece i between its resting pose (lift 0) and its pulled-apart pose (lift 1). */
    liftedPose(i: number, lift: number): PiecePose {
      const r = restPose[i];
      const e = apartPose[i];
      q0.set(r[3], r[4], r[5], r[6]).slerp(q1.set(e[3], e[4], e[5], e[6]), lift);
      return { p: [mix(r[0], e[0], lift), mix(r[1], e[1], lift), mix(r[2], e[2], lift)], q: [q0.x, q0.y, q0.z, q0.w] };
    },
    /** Piece i at sample s of the recorded drop. */
    droppedPose(i: number, s: number): PiecePose {
      const p = samples[Math.min(Math.max(Math.round(s), 0), samples.length - 1)][i];
      return { p: [p[0], p[1], p[2]], q: [p[3], p[4], p[5], p[6]] };
    },
  };
}
export type BowlData = ReturnType<typeof makeBowl>;

const bowls = new Map<string, BowlData>();
/** The recipe's bowl: its build file and its physics bake. */
export function bowlOf(slug: string): BowlData {
  const known = bowls.get(slug);
  if (known) return known;
  const key = `./${slug}`;
  if (!builds.keys().includes(`${key}.build.json`)) throw new Error(`${slug} has no bowl (src/recipes/${slug}.build.json)`);
  if (!drops.keys().includes(`${key}.drop.json`)) throw new Error(`${slug} has no physics bake; run node tools/bake-drop.mjs ${slug}`);
  const bowl = makeBowl(slug, builds(`${key}.build.json`) as Build, drops(`${key}.drop.json`) as { frames: unknown[]; items: unknown[] });
  bowls.set(slug, bowl);
  return bowl;
}
/** Whether the recipe has a bowl that has been baked. */
export const hasBowl = (slug: string) => builds.keys().includes(`./${slug}.build.json`) && drops.keys().includes(`./${slug}.drop.json`);

/** Where the camera is and what it looks at. apart runs from 0 (the finished bowl, close
 * up) to 1 (pulled apart); titleRoom slides the bowl right to make room for a title on
 * the left (in the vertical cut, down, under a title on top); close is the distance to
 * the finished bowl. */
export function orbit(azimuth: number, apart: number, titleRoom = 0, close = 0.7, tall = false, aside = tall ? 0.17 : 0.09) {
  const dist = mix(close, tall ? 1.5 : 1.95, apart);
  const elevation = mix(0.98, 0.3, apart);
  // aside: how far right of the floating layers to look, to leave room for their labels
  const target = new THREE.Vector3(mix(0, aside, apart), mix(0.03, 0.34, apart), 0);
  if (tall) target.addScaledVector(new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth)), 0.02 * titleRoom);
  // the camera's right, along the table
  else target.addScaledVector(new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)), -0.085 * titleRoom);
  const position = new THREE.Vector3(
    target.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
    target.y + Math.sin(elevation) * dist,
    target.z + Math.cos(azimuth) * Math.cos(elevation) * dist,
  );
  return { position, target };
}

export function CameraRig({ position, target }: { position: THREE.Vector3; target: THREE.Vector3 }) {
  const { camera } = useThree();
  camera.position.copy(position);
  camera.lookAt(target);
  return null;
}

/** Every piece of food, grouped by layer. While the layers float, idle (0 to 1) bobs and
 * turns each one gently. */
export function BowlFood({ bowl, poseOf, idle = 0, frame }: { bowl: BowlData; poseOf: (i: number) => PiecePose; idle?: number; frame: number }) {
  const { build, layerBox, items } = bowl;
  return (
    <>
      {build.layers.map((layer, li) => {
        const c = layerBox[li].center;
        const bob = 0.005 * Math.sin(frame / 17 + li * 1.7) * idle;
        const yaw = 0.07 * Math.sin(frame / 37 + li * 1.3) * idle;
        return (
          <group key={layer.id} position={[c[0], c[1] + bob, c[2]]} rotation-y={yaw}>
            <group position={[-c[0], -c[1], -c[2]]}>
              {items.map((it, i) => {
                if (it.layer !== li) return null;
                const { p, q } = poseOf(i);
                return (
                  <group key={i} position={p} quaternion={q}>
                    <Piece kind={it.kind} variant={it.variant} rice={build.kinds[it.kind].lathe} />
                  </group>
                );
              })}
            </group>
          </group>
        );
      })}
    </>
  );
}

/** A loose drizzle of sauce across the whole bowl. Each point is dropped straight down
 * onto the settled food (a raycast against the same pieces the scene draws), so the
 * sauce lies on the food and drapes over its edges. */
function foodSurface(kit: ReturnType<typeof useKit>, { restPose, items, build }: BowlData) {
  const food = new THREE.Group();
  restPose.forEach((p, i) => {
    const piece = pieceObject(kit, items[i].kind, items[i].variant, build.kinds[items[i].kind].lathe);
    piece.position.set(p[0], p[1], p[2]);
    piece.quaternion.set(p[3], p[4], p[5], p[6]);
    food.add(piece);
  });
  food.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const floor = build.bowl.profile[0][1];
  /** The height of the food straight below a point. */
  return (x: number, z: number) => {
    ray.set(new THREE.Vector3(x, 0.5, z), down);
    return ray.intersectObject(food, true)[0]?.point.y ?? floor;
  };
}

function sauceGeometry(kit: ReturnType<typeof useKit>, bowl: BowlData) {
  const heightAt = foodSurface(kit, bowl);
  const { from, span, center, amp, waves, window: w = 4 } = bowl.build.sauce.drizzle;
  const r = rng(91);
  const n = 260;
  const raw = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const x = from + span * t;
    const z = center + amp * Math.sin(t * Math.PI * waves + 0.4) * (1 - 0.3 * Math.abs(2 * t - 1)) + 0.002 * (r() - 0.5);
    return new THREE.Vector3(x, heightAt(x, z), z);
  });
  // Bridge small gaps between pieces, then smooth the line.
  const bridged = raw.map((_, i) => Math.max(...raw.slice(Math.max(0, i - w), i + w + 1).map((v) => v.y)));
  const pts = raw.map((v, i) => {
    const near = bridged.slice(Math.max(0, i - w), i + w + 1);
    return new THREE.Vector3(v.x, near.reduce((s, y) => s + y, 0) / near.length + 0.0016, v.z);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.0019, 10, false);
}

/** The drizzle. lift (0 to 1) floats it up to its pulled-apart height; drawn (0 to 1)
 * is how much of the line has been poured. */
export function Sauce({ bowl, lift, opacity, drawn }: { bowl: BowlData; lift: number; opacity: number; drawn: number }) {
  const kit = useKit();
  const geo = useMemo(() => sauceGeometry(kit, bowl), [kit, bowl]);
  const lowest = useMemo(() => {
    geo.computeBoundingBox();
    return geo.boundingBox!.min.y;
  }, [geo]);
  useLayoutEffect(() => {
    geo.setDrawRange(0, Math.floor(((geo.index?.count ?? 0) * drawn) / 6) * 6);
  }, [geo, drawn]);
  if (opacity <= 0 || drawn <= 0) return null;
  return (
    <mesh geometry={geo} position-y={(bowl.build.sauce.lift - lowest) * lift} castShadow>
      <meshPhysicalMaterial color={bowl.build.sauce.drizzle.color} roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
}

/** Seeds scattered over the finished food, each resting on it. shown (0 to 1) is how far
 * the sprinkle has come; lift (0 to 1) floats them up with the sauce. Nothing if the recipe
 * has no topping. */
export function Topping({ bowl, lift = 0, shown = 1 }: { bowl: BowlData; lift?: number; shown?: number }) {
  const kit = useKit();
  const topping = bowl.build.topping;
  const mesh = useMemo(() => {
    if (!topping) return null;
    const heightAt = foodSurface(kit, bowl);
    const r = rng(47);
    const seeds = Array.from({ length: topping.count }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * topping.radius;
      const [x, z] = [Math.cos(a) * d, Math.sin(a) * d];
      return { x, z, y: heightAt(x, z) + 0.0008, turn: r() * 6.3, tilt: (r() - 0.5) * 0.7, delay: r() };
    });
    const m = new THREE.InstancedMesh(kit.foods().sesame.geo, kit.foods().sesame.material, seeds.length);
    m.castShadow = true;
    m.userData.seeds = seeds;
    m.frustumCulled = false;
    return m;
  }, [kit, bowl, topping]);
  useLayoutEffect(() => {
    if (!mesh) return;
    const o = new THREE.Object3D();
    (mesh.userData.seeds as { x: number; y: number; z: number; turn: number; tilt: number; delay: number }[]).forEach((q, i) => {
      const t = Math.min(1, Math.max(0, (shown * 1.5 - q.delay * 0.5) / 1));
      o.position.set(q.x, q.y + (1 - t * t) * 0.12 + bowl.build.sauce.lift * lift, q.z);
      o.rotation.set(q.tilt, q.turn, 0);
      o.scale.setScalar(t > 0 ? 1 : 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [mesh, shown, lift, bowl]);
  return mesh && shown > 0 ? <primitive object={mesh} /> : null;
}

export function Label({ at, y, from, to, title, detail, show }: { at: number; y: number; from: number; to: number; title: string; detail: string; show: number }) {
  const points = useMemo((): [number, number, number][] => [[from, at, 0], [mix(from, to, show), mix(at, y, show), 0]], [from, at, to, y, show]);
  if (show <= 0) return null;
  return (
    <group>
      <Line points={points} color="#3B3127" lineWidth={1.4} transparent opacity={0.8 * show} />
      <Html position={[to + 0.012, y, 0]} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
        <div style={{ transform: `translate(${(1 - show) * 24}px, -50%)`, opacity: show }}>
          <div style={{ fontFamily: SERIF, fontSize: 40, color: "#2B231B", lineHeight: 1 }}>{title}</div>
          <div style={{ fontFamily: MONO, fontSize: 18, color: "#7A6A58", letterSpacing: 1, marginTop: 8 }}>{detail}</div>
        </div>
      </Html>
    </group>
  );
}

/** A label for every layer, plus the sauce. showOf(li) is how far layer li's label has
 * drawn in (0 to 1); the sauce is li = LAYERS. */
export function Labels({ bowl, showOf }: { bowl: BowlData; showOf: (li: number) => number }) {
  const { build, layerBox, LAYERS, sauceLabelY } = bowl;
  return (
    <>
      {build.layers.map((layer, li) => (
        <Label key={layer.id} at={layerBox[li].center[1]} y={layerBox[li].label} from={layerBox[li].right} to={0.2} title={layer.label} detail={layer.detail} show={showOf(li)} />
      ))}
      <Label at={sauceLabelY} y={sauceLabelY} from={0.1} to={0.2} title={build.sauce.label} detail={build.sauce.detail} show={showOf(LAYERS)} />
    </>
  );
}
