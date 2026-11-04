// The skillet template (docs/adr/0004-recipe-video-scene-files.md), in two ways of
// cooking. saute: slices fall into a hot, dry pan (step "add"), sit, then get a stir and
// brown ("stir"). smash: the pan smokes ("heat"), two balls of beef drop in ("add"),
// parchment goes on, a spatula presses each flat, the parchment comes off, salt and
// pepper, a rest for the crust ("rest"), a flip ("flip"), and the cheese melts. sear, char,
// and eggs are in panCooks.tsx.
import { useMemo } from "react";
import { Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { mix } from "../three/bowlShot";
import { rng } from "../geo";
import { cookable, meltingCheese, Steam, useRawFood } from "../three/cooking";
import { Parchment, SKILLET, SMALL_PAN, Skillet, Spatula } from "../three/cookware";
import { KitProvider, useKit } from "../three/ingredients";
import { Char, Eggs, PLATE_X, Sear } from "./panCooks";
import { Studio } from "../three/Studio";
import type { SceneData } from "./scenes";
import { SLICES, panLayout } from "./skillet";
import { Shot, Stage, aim, plop, ramp, type SceneProps, type TemplateProps } from "./stage";

type SkilletData = Extract<SceneData, { template: "skillet" }>;
const FLOOR = SKILLET.floor;

function PanShot({ s, children, az, small = false, fromPlate }: { s: SceneProps; children: React.ReactNode; az: readonly [number, number]; small?: boolean; fromPlate?: number }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  // A scene that starts at the plate beside the pan pans over to the pan at frame fromPlate.
  const away = fromPlate === undefined ? 0 : PLATE_X * (1 - ramp(f, fromPlate - 24, 40));
  const { position, target } = aim(s.tall ? [0.01, FLOOR + 0.01, -away] : [0.01 + away, FLOOR + 0.01, 0], mix(az[0], az[1], t), 0.95, (mix(0.54, 0.5, t) + (s.tall ? 0.1 : 0)) * (small ? 0.72 : 1));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      {/* In the vertical cut the pan turns so its handle runs up the frame. */}
      <group rotation-y={s.tall ? Math.PI / 2 : 0}>
        {small ? <Skillet nonstick scale={SMALL_PAN} /> : <Skillet />}
        <KitProvider>{children}</KitProvider>
      </group>
    </Stage>
  );
}

/* Saute ------------------------------------------------------------ */

function Saute({ scene, at }: { scene: Extract<SkilletData, { cook: "saute" }>; at: Record<string, number> }) {
  const f = useCurrentFrame();
  const kit = useKit();
  const { layout, mushroom, onion } = useMemo(
    () => ({ layout: panLayout(scene.food), mushroom: cookable(kit.mushroom.material, SLICES.mushroom.raw, SLICES.mushroom.keep), onion: cookable(kit.onionSlice.material, SLICES.onion.raw, SLICES.onion.keep) }),
    [kit, scene],
  );
  const done = ramp(f, at.stir - 10, 110, Easing.inOut(Easing.sin));
  const stir = ramp(f, at.stir + 4, 90, Easing.linear);
  const glaze = ramp(f, at.stir + 70, 20);
  mushroom.done(done).roughness = mix(0.4, 0.22, glaze);
  onion.done(done);
  return (
    <>
      {layout.map((p, i) => {
        const drop = plop(f, at.add + i * 1.6, 0.16, 9);
        if (!drop.shown) return null;
        const stirred = Math.sin(stir * Math.PI);
        const x = p.x + 0.007 * stirred * Math.cos(p.drift + stir * 5);
        const z = p.z + 0.007 * stirred * Math.sin(p.drift + stir * 5);
        const isMushroom = p.piece === "mushroom";
        const geo = isMushroom ? kit.mushroom.geos[p.variant % kit.mushroom.geos.length] : kit.onionSlice.geo;
        return <mesh key={i} geometry={geo} material={isMushroom ? mushroom.material : onion.material} position={[x, FLOOR + 0.0021 + drop.y, z]} rotation-y={p.yaw + stir * (i % 2 ? 0.8 : -0.8)} scale={[drop.grow, drop.squash * drop.grow, drop.grow]} castShadow receiveShadow />;
      })}
      <Steam from={[[-0.04, FLOOR, 0.02], [0.03, FLOOR, -0.03], [0.0, FLOOR, 0.05]]} frame={f} amount={ramp(f, at.add + 24, 30) * 0.8} spread={0.05} />
    </>
  );
}

/* Smash and flip --------------------------------------------------- */

const SIDES = [
  { at: [-0.047, 0.004], turn: 0.4 },
  { at: [0.049, -0.006], turn: 1.3 },
] as const;
const BALL = 0.05; // a beef ball's height
const FLAT = 0.008; // a smashed patty's height

/** When things happen to patty k, in scene frames. scenes.ts names the first patty's
 * drop, press, and flip as the moments "lands", "smash", and "turn"; keep them in step. */
function pattyTimes(b: Record<string, number>, k: number) {
  return { drop: b.add + 4 + k * 5, paper: b.add + 30 + k * 6, press: b.add + 50 + k * 22, peel: b.rest - 6 + k * 8, salt: b.rest + 14 + k * 4, flip: b.flip + 4 + k * 10, cheese: b.flip + 34 + k * 6 };
}

function Patty({ k, at, parchment, withCheese, cooked, raw, beefBall, beef, cheese, speck, salt }: {
  k: number;
  at: Record<string, number>;
  parchment: boolean;
  withCheese: boolean;
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
  const T = pattyTimes(at, k);
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
  const crust = ramp(f, at.rest, at.flip - at.rest, Easing.linear) * 0.3;

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
      {parchment && paper.shown && peel < 1 && <Parchment size={0.09} opacity={1 - peel} position={[0, top + 0.003 + paper.y + 0.05 * peel, 0]} rotation={[0.5 * peel, 0.3 + k, 0]} scale={paper.grow} />}
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
      {withCheese && cheeseDrop.shown && <mesh geometry={cheese} material={kit.cheeseMaterial} position-y={FLOOR + 0.0035 + 0.0062 + cheeseDrop.y} scale={cheeseDrop.grow} morphTargetInfluences={[melt]} castShadow receiveShadow />}
    </group>
  );
}

function Smash({ scene, at }: { scene: Extract<SkilletData, { cook: "smash" }>; at: Record<string, number> }) {
  const f = useCurrentFrame();
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
  const smoke = ramp(f, at.heat, 30) * (1 - ramp(f, at.add + 6, 20));
  const sizzle = ramp(f, at.add + 10, 20) * 0.6;
  return (
    <>
      {SIDES.map((_, k) => (
        <Patty key={k} k={k} at={at} parchment={scene.parchment ?? true} withCheese={scene.cheese ?? true} cooked={kit.patty[k].material} raw={parts.raw[k]} beefBall={food.beefBall} beef={food.beef} cheese={parts.cheese[k]} speck={parts.speck} salt={parts.salt} />
      ))}
      <Steam from={[[-0.05, FLOOR, 0.03], [0.04, FLOOR, -0.04], [0.0, FLOOR, 0.0], [0.06, FLOOR, 0.05]]} frame={f} amount={Math.max(smoke, sizzle)} spread={0.06} rise={0.16} />
    </>
  );
}

export function SkilletScene({ s, p }: TemplateProps) {
  const scene = p.scene as SkilletData;
  const views = {
    smash: () => <Smash scene={scene as Extract<SkilletData, { cook: "smash" }>} at={p.at} />,
    saute: () => <Saute scene={scene as Extract<SkilletData, { cook: "saute" }>} at={p.at} />,
    sear: () => <Sear at={p.at} />,
    char: () => <Char scene={scene as Extract<SkilletData, { cook: "char" }>} at={p.at} />,
    eggs: () => <Eggs at={p.at} />,
  };
  return <PanShot s={s} az={scene.camera} small={scene.cook === "eggs"} fromPlate={scene.cook === "sear" ? p.at.add : undefined}>{views[scene.cook]()}</PanShot>;
}
