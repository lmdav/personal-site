// The two skillet scenes. Mushrooms and onions fall into a hot, dry pan, sit, then get a
// stir and brown. Then the patties: the pan smokes, two balls of beef drop in, parchment
// goes on, a spatula presses each flat, the parchment comes off, salt and pepper, two
// minutes for the crust, a flip, and the cheese melts.
import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { rng } from "../geo";
import { mix } from "../three/bowlShot";
import { cookable, meltingCheese, Steam, useRawFood } from "../three/cooking";
import { Parchment, SKILLET, Skillet, Spatula } from "../three/cookware";
import { KitProvider, useKit } from "../three/ingredients";
import { Studio } from "../three/Studio";
import { Chip } from "./overlay";
import type { Cue } from "./sound";
import { Shot, Stage, aim, plop, ramp, type SceneProps } from "./stage";

const FLOOR = SKILLET.floor;
const window = (f: number, from: number, to: number) => interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

function PanShot({ s, children, az }: { s: SceneProps; children: React.ReactNode; az: [number, number] }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  const { position, target } = aim([0.01, FLOOR + 0.01, 0], mix(az[0], az[1], t), 0.95, mix(0.54, 0.5, t) + (s.tall ? 0.1 : 0));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      {/* In the vertical cut the pan turns so its handle runs up the frame. */}
      <group rotation-y={s.tall ? Math.PI / 2 : 0}>
        <Skillet />
        <KitProvider>{children}</KitProvider>
      </group>
    </Stage>
  );
}

/* Mushrooms and onions -------------------------------------------- */

/** Mushroom slices and onion slices in one layer, not touching. */
function panLayout() {
  const r = rng(33);
  const placed: { x: number; z: number; mushroom: boolean; variant: number; yaw: number; drift: number }[] = [];
  const tryPlace = (mushroom: boolean, gap: number) => {
    for (let k = 0; k < 400; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * 0.083;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (placed.every((p) => Math.hypot(p.x - x, p.z - z) > (p.mushroom && mushroom ? 0.034 : gap))) {
        placed.push({ x, z, mushroom, variant: placed.length, yaw: r() * 6.3, drift: r() * 6.3 });
        return;
      }
    }
  };
  for (let i = 0; i < 11; i++) tryPlace(true, 0.026);
  for (let i = 0; i < 9; i++) tryPlace(false, 0.022);
  return placed;
}

function Mushrooms({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const b = s.beats;
  const kit = useKit();
  const { layout, mushroom, onion } = useMemo(() => ({ layout: panLayout(), mushroom: cookable(kit.mushroom.material, "#C4AE8E", 0.7), onion: cookable(kit.onionSlice.material, "#EEE7D8", 0.2) }), [kit]);
  const done = ramp(f, b[1] - 10, 110, Easing.inOut(Easing.sin));
  const stir = ramp(f, b[1] + 4, 90, Easing.linear);
  const glaze = ramp(f, b[1] + 70, 20);
  mushroom.done(done).roughness = mix(0.4, 0.22, glaze);
  onion.done(done);
  return (
    <>
      {layout.map((p, i) => {
        const drop = plop(f, 6 + i * 1.6, 0.16, 9);
        if (!drop.shown) return null;
        const stirred = Math.sin(stir * Math.PI);
        const x = p.x + 0.007 * stirred * Math.cos(p.drift + stir * 5);
        const z = p.z + 0.007 * stirred * Math.sin(p.drift + stir * 5);
        const geo = p.mushroom ? kit.mushroom.geos[p.variant % kit.mushroom.geos.length] : kit.onionSlice.geo;
        return <mesh key={i} geometry={geo} material={p.mushroom ? mushroom.material : onion.material} position={[x, FLOOR + 0.0021 + drop.y, z]} rotation-y={p.yaw + stir * (i % 2 ? 0.8 : -0.8)} scale={[drop.grow, drop.squash * drop.grow, drop.grow]} castShadow receiveShadow />;
      })}
      <Steam from={[[-0.04, FLOOR, 0.02], [0.03, FLOOR, -0.03], [0.0, FLOOR, 0.05]]} frame={f} amount={ramp(f, 30, 30) * 0.8} spread={0.05} />
    </>
  );
}

/** The pan sizzling from the moment the mushrooms land. */
export const mushroomCues = (b: number[], len: number): Cue[] => [{ sound: "pan", at: 8, len: len - 8, volume: 0.1, fade: 15 }];

export function MushroomScene({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const b = s.beats;
  return (
    <>
      <PanShot s={s} az={[-0.1, 0.08]}>
        <Mushrooms s={s} />
      </PanShot>
      <Chip text="HANDS OFF · 2 MIN" show={window(f, b[0] + 40, b[1])} progress={ramp(f, b[0] + 40, b[1] - b[0] - 40, Easing.linear)} />
      <Chip text="OIL, THEN STIR · 3 TO 4 MIN" show={window(f, b[1], s.len)} progress={ramp(f, b[1], s.len - b[1] - 6, Easing.linear)} />
    </>
  );
}

/* Smash patties ---------------------------------------------------- */

const SIDES = [
  { at: [-0.047, 0.004], turn: 0.4 },
  { at: [0.049, -0.006], turn: 1.3 },
] as const;
const BALL = 0.05; // a beef ball's height
const FLAT = 0.008; // a smashed patty's height

/** When things happen to patty k, in scene frames. */
function pattyTimes(b: number[], k: number) {
  return { drop: b[1] + 4 + k * 5, paper: b[1] + 30 + k * 6, press: b[1] + 50 + k * 22, peel: b[2] - 6 + k * 8, salt: b[2] + 14 + k * 4, flip: b[3] + 4 + k * 10, cheese: b[3] + 34 + k * 6 };
}
export const pattyMinFrames = (beats: number[]) => beats[3] + 100;
/** The sizzle starts when the beef hits the pan and swells when it is smashed and flipped. */
export function pattyCues(b: number[], len: number): Cue[] {
  const t = pattyTimes(b, 0);
  return [
    { sound: "sizzle", at: t.drop, len: len - t.drop, volume: 0.13, fade: 8 },
    { sound: "sizzle", at: t.press + 6, len: 90, volume: 0.09, from: 5, fade: 20 },
    { sound: "sizzle", at: t.flip + 6, len: 60, volume: 0.07, from: 9, fade: 15 },
  ];
}

function Patty({ k, s, cooked, raw, beefBall, beef, cheese, speck, salt }: {
  k: number;
  s: SceneProps;
  cooked: THREE.Material;
  raw: { done: (d: number) => THREE.Material };
  beefBall: THREE.BufferGeometry;
  beef: THREE.Material;
  cheese: THREE.BufferGeometry;
  speck: THREE.BufferGeometry;
  salt: { x: number; z: number; yaw: number; pepper: boolean }[];
}) {
  const f = useCurrentFrame();
  const kit = useKit();
  const T = pattyTimes(s.beats, k);
  const [x, z] = SIDES[k].at;
  const drop = plop(f, T.drop, 0.16);
  if (!drop.shown) return null;
  const pressed = ramp(f, T.press + 7, 5, Easing.out(Easing.quad));
  const h = mix(BALL, FLAT, pressed);
  const top = FLOOR + h;
  const paper = plop(f, T.paper, 0.08, 8);
  const peel = ramp(f, T.peel, 12, Easing.in(Easing.quad));
  const flip = ramp(f, T.flip, 16, Easing.inOut(Easing.cubic)) * Math.PI;
  const flipped = flip > Math.PI / 2;
  const crust = ramp(f, s.beats[2], s.beats[3] - s.beats[2], Easing.linear) * 0.3;

  // the spatula: down onto the parchment, press, hold, and back up
  const t = f - T.press;
  const spatulaY = t < 0 || t > 22 ? null : t < 7 ? mix(top + 0.12, top, ramp(t, 0, 7, Easing.inOut(Easing.quad))) : t < 14 ? top : mix(top, top + 0.12, ramp(t, 14, 8, Easing.in(Easing.quad)));
  const melt = ramp(f, T.cheese + 10, 50, Easing.inOut(Easing.sin));
  const cheeseDrop = plop(f, T.cheese, 0.07, 8);
  return (
    <group position={[x, 0, z]}>
      {pressed < 1 ? (
        <mesh geometry={beefBall} material={beef} position-y={FLOOR + h / 2 - 0.0005 + drop.y} scale={[(1 + 0.68 * pressed) * drop.grow, (h / BALL) * drop.squash * drop.grow, (1 + 0.68 * pressed) * drop.grow]} castShadow receiveShadow />
      ) : (
        <group position-y={FLOOR + 0.0035 + 0.035 * Math.sin(flip)} rotation-x={flipped ? flip - Math.PI : flip} rotation-y={SIDES[k].turn}>
          <mesh geometry={kit.patty[k].geo} material={flipped ? cooked : raw.done(crust)} castShadow receiveShadow />
        </group>
      )}
      {paper.shown && peel < 1 && <Parchment size={0.09} opacity={1 - peel} position={[0, top + 0.003 + paper.y + 0.05 * peel, 0]} rotation={[0.5 * peel, 0.3 + k, 0]} scale={paper.grow} />}
      {spatulaY !== null && <Spatula position={[0, spatulaY + 0.0035, 0]} rotation-y={k ? Math.PI : 0} />}
      {!flipped && pressed >= 1 &&
        salt.map((q, i) => {
          const p = plop(f, T.salt + (i % 8), 0.06, 6);
          if (!p.shown) return null;
          return (
            <mesh key={i} geometry={speck} position={[q.x, FLOOR + 0.0092 + p.y, q.z]} rotation-y={q.yaw} scale={p.grow}>
              <meshStandardMaterial color={q.pepper ? "#2A2522" : "#F4F1EA"} roughness={0.6} />
            </mesh>
          );
        })}
      {cheeseDrop.shown && <mesh geometry={cheese} material={kit.cheeseMaterial} position-y={FLOOR + 0.0035 + 0.0062 + cheeseDrop.y} scale={cheeseDrop.grow} morphTargetInfluences={[melt]} castShadow receiveShadow />}
    </group>
  );
}

function Patties({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const b = s.beats;
  const kit = useKit();
  const food = useRawFood();
  const parts = useMemo(() => {
    const r = rng(17);
    return {
      raw: kit.patty.map((p) => cookable(p.material, "#B5525A", 0.45)),
      // a smaller radius than the bowl's, so the corners slump into the patty as it melts
      cheese: SIDES.map((side) => meltingCheese(0.064, 0.039, side.turn)),
      speck: new THREE.BoxGeometry(0.0011, 0.0004, 0.0011),
      salt: Array.from({ length: 34 }, (_, i) => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 0.036;
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, yaw: r() * 6.3, pepper: i % 2 === 0 };
      }),
    };
  }, [kit]);
  const smoke = ramp(f, 6, 30) * (1 - ramp(f, b[1] + 6, 20));
  const sizzle = ramp(f, b[1] + 10, 20) * 0.6;
  return (
    <>
      {SIDES.map((_, k) => (
        <Patty key={k} k={k} s={s} cooked={kit.patty[k].material} raw={parts.raw[k]} beefBall={food.beefBall} beef={food.beef} cheese={parts.cheese[k]} speck={parts.speck} salt={parts.salt} />
      ))}
      <Steam from={[[-0.05, FLOOR, 0.03], [0.04, FLOOR, -0.04], [0.0, FLOOR, 0.0], [0.06, FLOOR, 0.05]]} frame={f} amount={Math.max(smoke, sizzle)} spread={0.06} rise={0.16} />
    </>
  );
}

export function PattyScene({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const b = s.beats;
  return (
    <>
      <PanShot s={s} az={[0.12, -0.06]}>
        <Patties s={s} />
      </PanShot>
      <Chip text="HIGH HEAT · 3 MIN" show={window(f, 8, b[1])} progress={ramp(f, 8, b[1] - 14, Easing.linear)} />
      <Chip text="HANDS OFF · 2 MIN" show={window(f, b[2], b[3])} progress={ramp(f, b[2], b[3] - b[2] - 4, Easing.linear)} />
      <Chip text="COVER · 20 TO 30 SEC" show={window(f, b[3] + 30, s.len)} progress={ramp(f, b[3] + 40, 50, Easing.linear)} />
    </>
  );
}
