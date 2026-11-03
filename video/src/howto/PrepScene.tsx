// The prep template (docs/adr/0004-recipe-video-scene-files.md), for smashed potatoes:
// three whole potatoes on a plate get poked with a fork (step "poke"), then the plate
// turns under a warm glow like a microwave turntable ("microwave"). They hop over to the
// cutting board to cool and steam ("cool"), a cup presses each one flat ("press"), and
// they crisp from pale to deep golden ("crisp"). A pressed potato is the same
// photo-traced piece the bowl uses (src/three/relief.ts), shown raw until it crisps. In
// the vertical cut the whole set turns a quarter turn, so the board runs up the frame.
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { mix } from "../three/bowlShot";
import { cookable, Steam, useRawFood } from "../three/cooking";
import { Cup, Fork, PLATE_TOP, Plate } from "../three/cookware";
import { KitProvider, useKit } from "../three/ingredients";
import { Prop, Studio } from "../three/Studio";
import { Shot, Stage, aim, ramp, type SceneProps, type TemplateProps } from "./stage";

type V3 = [number, number, number];
const TOP = 0.0413; // the cutting board's surface
const SPOTS: [number, number][] = [[-0.078, 0.022], [0.0, -0.028], [0.078, 0.026]]; // on the board
const PLATE: [number, number] = [-0.37, 0]; // the plate, on the table left of the board
const ON_PLATE: [number, number][] = [[-0.035, 0.03], [0.04, 0.015], [-0.005, -0.04]];
const WHOLE = 0.046; // a whole potato's height
const FLAT = 0.0135; // a pressed potato's height
const PRESS = 20; // frames per press
const HIGH = 0.16; // the cup's height between presses
const POKE = 14; // frames per fork poke, two per potato

/** The scene's steps, in scene frames. */
type Steps = Record<"poke" | "microwave" | "cool" | "press" | "crisp", number>;
const pressStart = (b: Steps, k: number) => b.press + 6 + k * PRESS;
const hopStart = (b: Steps, k: number) => b.cool + 4 + k * 7;
const pokeStart = (b: Steps) => b.poke + 26;

/** Turns a point a quarter turn around the middle of the board, the same turn the vertical
 * cut gives the whole set. */
const turned = (p: V3, tall: boolean): V3 => (tall ? [p[2], p[1], -p[0]] : p);

/** How far the plate has turned in the microwave. */
const spinOf = (f: number, b: Steps) => ramp(f, b.microwave + 4, b.cool - b.microwave - 10, Easing.inOut(Easing.sin)) * Math.PI * 2.5;

/** Where potato k sits on the plate, as the plate turns. */
function onPlate(k: number, spin: number): [number, number] {
  const [x, z] = ON_PLATE[k];
  return [PLATE[0] + x * Math.cos(spin) + z * Math.sin(spin), PLATE[1] - x * Math.sin(spin) + z * Math.cos(spin)];
}

/** The middle of whole potato k: on the plate, hopping to the board, or on the board. */
function wholeAt(f: number, b: Steps, k: number): V3 {
  const [px, pz] = onPlate(k, spinOf(f, b));
  const t = ramp(f, hopStart(b, k), 22, Easing.inOut(Easing.cubic));
  const [bx, bz] = SPOTS[k];
  const base = mix(PLATE_TOP, TOP, t) + 0.09 * Math.sin(t * Math.PI);
  return [mix(px, bx, t), base + WHOLE / 2 - 0.0004, mix(pz, bz, t)];
}

/** How far potato k is pressed (0 to 1) at frame f. */
const pressed = (f: number, b: Steps, k: number) => ramp(f, pressStart(b, k) + 7, 5, Easing.out(Easing.quad));

/** Where the cup's base is: over each potato in turn, coming in from and leaving to the
 * upper right. */
function cupAt(f: number, b: Steps): V3 | null {
  const first = pressStart(b, 0);
  const last = pressStart(b, SPOTS.length - 1) + PRESS;
  const away: V3 = [0.3, 0.26, 0.02];
  if (f < first - 12 || f > last + 12) return null;
  if (f < first) {
    const t = ramp(f, first - 12, 12);
    return [mix(away[0], SPOTS[0][0], t), mix(away[1], TOP + HIGH, t), mix(away[2], SPOTS[0][1], t)];
  }
  if (f > last) {
    const t = ramp(f, last, 12);
    const [x, z] = SPOTS[SPOTS.length - 1];
    return [mix(x, away[0], t), mix(TOP + HIGH, away[1], t), mix(z, away[2], t)];
  }
  const k = Math.min(Math.floor((f - first) / PRESS), SPOTS.length - 1);
  const t = f - pressStart(b, k);
  const [x, z] = SPOTS[k];
  const [px, pz] = k > 0 ? SPOTS[k - 1] : SPOTS[0];
  if (t < 7) {
    const d = ramp(t, 0, 7, Easing.inOut(Easing.quad));
    return [mix(px, x, d), mix(TOP + HIGH, TOP + WHOLE, d), mix(pz, z, d)];
  }
  if (t < 14) return [x, TOP + mix(WHOLE, FLAT, pressed(f, b, k)), z];
  return [x, mix(TOP + FLAT, TOP + HIGH, ramp(t, 14, 6, Easing.in(Easing.quad))), z];
}

/** Where the fork's tips are: two quick pokes into each potato on the plate, coming in
 * from and leaving to the upper right. */
function forkAt(f: number, b: Steps): V3 | null {
  const first = pokeStart(b);
  const end = first + ON_PLATE.length * 2 * POKE;
  if (f < first - 10 || f > end + 10) return null;
  const n = ON_PLATE.length * 2;
  const i = Math.min(Math.max(Math.floor((f - first) / POKE), 0), n - 1);
  const spot = (j: number): [number, number] => {
    const [px, pz] = onPlate(Math.floor(j / 2), 0);
    return [px + (j % 2 ? 0.008 : -0.008), pz];
  };
  const [x, z] = spot(i);
  const top = PLATE_TOP + WHOLE;
  const up = top + 0.07;
  if (f < first) {
    const e = ramp(f, first - 10, 10);
    return [mix(x + 0.25, x, e), mix(up + 0.12, up, e), z];
  }
  if (f > end) return [x, mix(up, up + 0.2, ramp(f, end, 10)), z];
  const t = f - (first + i * POKE);
  const depth = t < 5 ? ramp(t, 0, 5, Easing.in(Easing.quad)) : t < 7 ? 1 : 1 - ramp(t, 7, 6, Easing.out(Easing.quad));
  // on the way back up, move over to the next poke so the fork never jumps
  const [nx, nz] = spot(Math.min(i + 1, n - 1));
  const go = ramp(t, 8, 6);
  return [mix(x, nx, go), mix(up, top - 0.006, depth), mix(z, nz, go)];
}

function Potatoes({ b }: { b: Steps }) {
  const f = useCurrentFrame();
  const kit = useKit();
  const raw = useRawFood();
  const smashed = useMemo(() => kit.potato.map((p) => cookable(p.material, "#E6D3A0", 0.5)), [kit]);
  const done = ramp(f, b.crisp + 6, 80, Easing.inOut(Easing.sin));
  const oiled = ramp(f, b.press + 66, 16);
  const spin = spinOf(f, b);
  const glow = interpolate(f, [b.microwave, b.microwave + 10, b.cool - 12, b.cool], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cup = cupAt(f, b);
  const fork = forkAt(f, b);
  const steamFrom = SPOTS.map((_, k): V3 => {
    const [x, y, z] = wholeAt(f, b, k);
    return [x, y + 0.02, z];
  });
  return (
    <>
      <Prop model="wooden_cutting_board" />
      <Plate position={[PLATE[0], 0, PLATE[1]]} rotation-y={spin} />
      {glow > 0 && <pointLight position={[PLATE[0], 0.2, PLATE[1]]} color="#FFB36B" intensity={0.08 * glow} distance={0.9} decay={2} />}
      {SPOTS.map(([x, z], k) => {
        const p = pressed(f, b, k);
        // the same turn before and after the press, so the swap to the pressed piece lines up
        const turn = k * 1.3 + (f < hopStart(b, k) ? spin : spinOf(b.cool, b));
        if (p >= 1) {
          const m = smashed[k].done(done);
          m.roughness = mix(0.5, 0.3, oiled);
          return <mesh key={k} geometry={kit.potato[k].geo} material={m} position={[x, TOP + 0.0058, z]} rotation-y={turn} castShadow receiveShadow />;
        }
        const h = mix(WHOLE, FLAT, p);
        const wide = 1 + 0.32 * p;
        const [wx, wy, wz] = wholeAt(f, b, k);
        return <mesh key={k} geometry={raw.potatoes[k]} material={raw.potatoSkin} position={[wx, wy - (WHOLE - h) / 2, wz]} scale={[wide, h / WHOLE, wide]} rotation-y={turn} castShadow receiveShadow />;
      })}
      {fork && <Fork position={fork} rotation-z={0.3} />}
      {cup && <Cup position={cup} />}
      <Steam from={steamFrom} frame={f} amount={ramp(f, b.microwave + 30, 30) * (1 - ramp(f, b.press - 20, 20))} />
    </>
  );
}

function Turned({ tall, children }: { tall: boolean; children: ReactNode }) {
  return <group rotation-y={tall ? Math.PI / 2 : 0}>{children}</group>;
}

function Board({ s, b }: { s: SceneProps; b: Steps }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  // From the plate over to the board, then down more steeply as the potatoes crisp, so
  // their tops fill the view.
  const pan = ramp(f, b.cool - 6, 46);
  const overhead = ramp(f, b.crisp - 10, 40);
  const at = turned([mix(PLATE[0], 0, pan), mix(0.03, TOP + 0.008, pan), 0], s.tall);
  const { position, target } = aim(at, mix(-0.18, 0.04, t), mix(0.9, 1.22, overhead), mix(0.42, 0.41, t) + 0.05 * overhead + (s.tall ? 0.04 : 0));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      <KitProvider>
        <Turned tall={s.tall}>
          <Potatoes b={b} />
        </Turned>
      </KitProvider>
    </Stage>
  );
}

export function PrepScene({ s, p }: TemplateProps) {
  return <Board s={s} b={p.at as Steps} />;
}
