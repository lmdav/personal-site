// What every how-to scene shares: the 3D canvas, a camera aimed at a point (with the lens
// focused there), and small timing helpers. Scenes get their length and the frame each
// narration beat starts on, so actions land on the words that describe them.
import { ThreeCanvas } from "@remotion/three";
import type { ReactNode } from "react";
import { Easing, interpolate, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig } from "../three/bowlShot";
import { Lens, dprFor } from "../three/Studio";
import type { Planned, SceneFile } from "./scenes";

export type SceneProps = {
  /** Length of the scene in frames. */
  len: number;
  /** The frame each narration beat starts on, within the scene. */
  beats: number[];
  /** Half resolution and no lens effects, for quick previews. */
  draft: boolean;
  /** The vertical 9:16 cut, for phones. Scenes frame it on their own. */
  tall: boolean;
};

/** What every template gets: the scene's frame props, its plan (steps, times, chips,
 * and sounds in scene frames), the recipe's scene file, and its slug. */
export type TemplateProps = { s: SceneProps; p: Planned; file: SceneFile; slug: string };

/** The lens's vertical field of view: wider for the vertical cut, so the subject still
 * fits across the narrow frame. */
export const fovFor = (tall: boolean) => (tall ? 46 : 28);

export function Stage({ s, children }: { s: SceneProps; children: ReactNode }) {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} dpr={dprFor(s.draft)} shadows camera={{ fov: fovFor(s.tall), near: 0.01, far: 20, position: [0, 0.5, 0.8] }} gl={{ antialias: false, preserveDrawingBuffer: true }}>
      {children}
    </ThreeCanvas>
  );
}

/** A camera looking at target from the given angle (azimuth around the table, elevation
 * above it, both in radians) and distance in meters, with the lens focused on target.
 * right slides the target to the camera's right, which moves the subject left on screen;
 * down slides it away from the camera, which moves the subject down on screen. */
export function aim(target: [number, number, number], azimuth: number, elevation: number, dist: number, right = 0, down = 0) {
  const t = new THREE.Vector3(...target)
    .addScaledVector(new THREE.Vector3(Math.cos(azimuth), 0, -Math.sin(azimuth)), right)
    .addScaledVector(new THREE.Vector3(-Math.sin(azimuth), 0, -Math.cos(azimuth)), down);
  const position = new THREE.Vector3(
    t.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
    t.y + Math.sin(elevation) * dist,
    t.z + Math.cos(azimuth) * Math.cos(elevation) * dist,
  );
  return { position, target: t };
}

export function Shot({ position, target, draft }: { position: THREE.Vector3; target: THREE.Vector3; draft: boolean }) {
  return (
    <>
      <CameraRig position={position} target={target} />
      {!draft && <Lens focus={[target.x, target.y, target.z]} />}
    </>
  );
}

const clamped = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 before frame `from`, 1 after `from + dur`, eased in between. */
export const ramp = (frame: number, from: number, dur: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [from, from + dur], [0, 1], { ...clamped, easing });

/** A drop from height h that lands at frame `at` (falling for `dur` frames, like gravity),
 * then squashes and springs back. Returns the height above the landing spot, the vertical
 * squash (1 at rest), and grow, which scales the piece in over its first three frames so
 * nothing pops into view. */
export function plop(frame: number, at: number, h = 0.12, dur = 9) {
  if (frame < at - dur) return { y: h, squash: 1, grow: 0, shown: false };
  if (frame < at) {
    const t = (frame - (at - dur)) / dur;
    return { y: h * (1 - t * t), squash: 1, grow: Math.min(1, (frame - (at - dur) + 1) / 3), shown: true };
  }
  const k = frame - at;
  const squash = 1 - 0.28 * Math.exp(-k / 3) * Math.cos(k / 1.6);
  return { y: 0, squash, grow: 1, shown: true };
}
