// The finished bowl as a product shot, shared by the proof and the how-to video: the
// layers from the build spec, their resting and pulled-apart poses and the recorded drop
// from the physics bake (tools/bake-drop.mjs), the orbiting camera, the sauce drizzle,
// and the labels with leader lines.
import { Html, Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import drop from "../data/smash-burger-bowl.drop.json";
import spec from "../recipes/smash-burger-bowl.build.json";
import { rng } from "../geo";
import { MONO, SERIF } from "../theme";
import { Piece, pieceObject, useKit, type Kind } from "./ingredients";

/** The recipe whose bowl this draws. The scene templates that show the bowl check it. */
export const BOWL_SLUG = "smash-burger-bowl";
export const build = spec;
type Pose = number[]; // x, y, z, then rotation as a quaternion
export const samples = drop.frames as Pose[][];
export const apartPose = samples[0];
export const restPose = samples[samples.length - 1];
export const items = drop.items as { layer: number; kind: Kind; variant: number; release: number }[];
export const LAYERS = build.layers.length;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// Each layer's middle, its right edge, and its label height, while pulled apart. Labels
// keep at least 8.5 cm apart, working up from the bottom.
export const layerBox = build.layers.map((_, li) => {
  const ps = apartPose.filter((_, i) => items[i].layer === li);
  const avg = (k: number) => ps.reduce((s, p) => s + p[k], 0) / ps.length;
  return { center: [avg(0), avg(1), avg(2)] as const, right: Math.max(...ps.map((p) => p[0])) + 0.035, label: avg(1) };
});
layerBox.forEach((box, li) => {
  if (li > 0) box.label = Math.max(box.label, layerBox[li - 1].label + 0.085);
});
export const sauceLabelY = Math.max(build.sauce.lift + 0.01, layerBox[LAYERS - 1].label + 0.085);

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

export type PiecePose = { p: [number, number, number]; q: [number, number, number, number] };
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion();

/** Piece i between its resting pose (lift 0) and its pulled-apart pose (lift 1). */
export function liftedPose(i: number, lift: number): PiecePose {
  const r = restPose[i];
  const e = apartPose[i];
  q0.set(r[3], r[4], r[5], r[6]).slerp(q1.set(e[3], e[4], e[5], e[6]), lift);
  return { p: [mix(r[0], e[0], lift), mix(r[1], e[1], lift), mix(r[2], e[2], lift)], q: [q0.x, q0.y, q0.z, q0.w] };
}

/** Piece i at sample s of the recorded drop. */
export function droppedPose(i: number, s: number): PiecePose {
  const p = samples[Math.min(Math.max(Math.round(s), 0), samples.length - 1)][i];
  return { p: [p[0], p[1], p[2]], q: [p[3], p[4], p[5], p[6]] };
}

/** Every piece of food, grouped by layer. While the layers float, idle (0 to 1) bobs and
 * turns each one gently. */
export function BowlFood({ poseOf, idle = 0, frame }: { poseOf: (i: number) => PiecePose; idle?: number; frame: number }) {
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
                    <Piece kind={it.kind} variant={it.variant} />
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
function sauceGeometry(kit: ReturnType<typeof useKit>) {
  const food = new THREE.Group();
  restPose.forEach((p, i) => {
    const piece = pieceObject(kit, items[i].kind, items[i].variant);
    piece.position.set(p[0], p[1], p[2]);
    piece.quaternion.set(p[3], p[4], p[5], p[6]);
    food.add(piece);
  });
  food.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const floor = build.bowl.profile[0][1];
  const r = rng(91);
  const n = 260;
  const raw = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const x = -0.075 + 0.16 * t;
    const z = 0.042 * Math.sin(t * Math.PI * 9 + 0.4) * (1 - 0.3 * Math.abs(2 * t - 1)) + 0.002 * (r() - 0.5);
    ray.set(new THREE.Vector3(x, 0.5, z), down);
    const hit = ray.intersectObject(food, true)[0];
    return new THREE.Vector3(x, hit ? hit.point.y : floor, z);
  });
  // Bridge small gaps between pieces, then smooth the line.
  const bridged = raw.map((_, i) => Math.max(...raw.slice(Math.max(0, i - 4), i + 5).map((w) => w.y)));
  const pts = raw.map((v, i) => {
    const near = bridged.slice(Math.max(0, i - 4), i + 5);
    return new THREE.Vector3(v.x, near.reduce((s, y) => s + y, 0) / near.length + 0.0016, v.z);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 600, 0.0019, 10, false);
}

/** The drizzle. lift (0 to 1) floats it up to its pulled-apart height; drawn (0 to 1)
 * is how much of the line has been poured. */
export function Sauce({ lift, opacity, drawn }: { lift: number; opacity: number; drawn: number }) {
  const kit = useKit();
  const geo = useMemo(() => sauceGeometry(kit), [kit]);
  const lowest = useMemo(() => {
    geo.computeBoundingBox();
    return geo.boundingBox!.min.y;
  }, [geo]);
  useLayoutEffect(() => {
    geo.setDrawRange(0, Math.floor(((geo.index?.count ?? 0) * drawn) / 6) * 6);
  }, [geo, drawn]);
  if (opacity <= 0 || drawn <= 0) return null;
  return (
    <mesh geometry={geo} position-y={(build.sauce.lift - lowest) * lift} castShadow>
      <meshPhysicalMaterial color="#EDB38A" roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
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
export function Labels({ showOf }: { showOf: (li: number) => number }) {
  return (
    <>
      {build.layers.map((layer, li) => (
        <Label key={layer.id} at={layerBox[li].center[1]} y={layerBox[li].label} from={layerBox[li].right} to={0.2} title={layer.label} detail={layer.detail} show={showOf(li)} />
      ))}
      <Label at={sauceLabelY} y={sauceLabelY} from={0.1} to={0.2} title={build.sauce.label} detail={build.sauce.detail} show={showOf(LAYERS)} />
    </>
  );
}
