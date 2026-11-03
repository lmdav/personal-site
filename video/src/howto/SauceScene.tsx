// The special sauce: each ingredient drops into a small bowl on the line that names it,
// and a list on the right grows with its amount. Then a spoon stirs it all from white with
// ribbons of color to the same pink as the drizzle on the finished bowl.
import { useMemo } from "react";
import { Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../geo";
import { mix } from "../three/bowlShot";
import { cookable, moundGeometry } from "../three/cooking";
import { SmallBowl, Spoon, smallBowlInside } from "../three/cookware";
import { KitProvider, useKit } from "../three/ingredients";
import { swirlTexture } from "../three/paint";
import { Studio } from "../three/Studio";
import { IngredientList } from "./overlay";
import type { Cue } from "./sound";
import { Shot, Stage, aim, plop, ramp, type SceneProps } from "./stage";

const SCALE = 0.42;
const { floor: FLOOR, radiusAt } = smallBowlInside(SCALE);
const YOGURT = { r: 0.03, h: 0.017 };
const FILL = FLOOR + 0.0085; // the stirred sauce's surface
const PINK = "#EDB38A";

/** The yogurt's surface height above the floor at a distance from the middle. */
const yogurtAt = (d: number) => YOGURT.h * Math.sqrt(Math.max(0, 1 - (d / YOGURT.r) ** 2.5));

/** When each thing lands, in scene frames, timed to the words. */
function landings(b: number[]) {
  return { yogurt: b[1] + 8, mayo: b[2] + 20, ketchup: b[2] + 40, mustard: b[2] + 62, pickles: b[3] + 12, juice: b[3] + 50, garlic: b[4] + 16, paprika: b[4] + 44, stir: b[5] + 4 };
}
export const sauceMinFrames = (beats: number[]) => beats[5] + 86;
/** A soft plop as each spoonful lands, and the spoon going round. */
export function sauceCues(b: number[]): Cue[] {
  const at = landings(b);
  // which plop in the file (its start, in seconds) and how loud, so they land near -27 dB
  const plop = (when: number, onset: number, volume: number): Cue => ({ sound: "plop", at: when - 1, len: 8, from: onset - 0.03, volume, fade: 2 });
  return [plop(at.yogurt, 2.25, 0.25), plop(at.mayo, 1.01, 0.7), plop(at.ketchup, 3.54, 0.45), plop(at.mustard, 4.32, 0.5), plop(at.pickles, 1.44, 0.5), { sound: "stir", at: at.stir - 2, len: 72, volume: 0.75, fade: 10 }];
}

const DOLLOPS = [
  { key: "mayo", at: [-0.012, 0.009], r: 0.0105, h: 0.0055, color: "#F2EAD0" },
  { key: "ketchup", at: [0.013, 0.004], r: 0.01, h: 0.006, color: "#A3241A" },
  { key: "mustard", at: [0.0, -0.014], r: 0.0095, h: 0.005, color: "#E3B22A" },
] as const;

/** Small things scattered over the yogurt: pickle bits and two spices. */
function scatter(seed: number, n: number, reach: number) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * reach;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, yaw: r() * 6.3, delay: (i % 12) + r() * 3 };
  });
}

function Sauce({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const at = landings(s.beats);
  const kit = useKit();
  const parts = useMemo(() => {
    const swirl = swirlTexture();
    swirl.center.set(0.5, 0.5);
    return {
      yogurt: moundGeometry(YOGURT.r, YOGURT.h, 0.25),
      dollops: DOLLOPS.map((d) => ({ geo: moundGeometry(d.r, d.h, 0.4), material: new THREE.MeshPhysicalMaterial({ color: d.color, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.1 }) })),
      yogurtMaterial: new THREE.MeshPhysicalMaterial({ color: "#F5F2EA", roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
      pickle: new RoundedBoxGeometry(0.0046, 0.0042, 0.0046, 2, 0.0008),
      speck: new THREE.BoxGeometry(0.0013, 0.0004, 0.0013),
      garlic: new THREE.MeshStandardMaterial({ color: "#E7D9B8", roughness: 0.8 }),
      paprika: new THREE.MeshStandardMaterial({ color: "#B0341C", roughness: 0.8 }),
      juice: new THREE.MeshPhysicalMaterial({ color: "#C8C27A", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.65 }),
      swirl,
      disc: new THREE.CircleGeometry(radiusAt(FILL) - 0.0008, 64),
      surface: cookable(new THREE.MeshPhysicalMaterial({ map: swirl, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.1 }), PINK, 0.12),
      pickles: scatter(5, 10, 0.021),
      garlicSpecks: scatter(6, 46, 0.025),
      paprikaSpecks: scatter(7, 46, 0.025),
    };
  }, []);

  const stir = ramp(f, at.stir, 66, Easing.inOut(Easing.sin));
  const sink = 1 - ramp(stir, 0, 0.55, Easing.linear); // how much of the mounds is left
  const surfaceY = mix(FLOOR + 0.003, FILL, ramp(stir, 0, 0.4, Easing.out(Easing.quad)));
  const spin = (f - at.stir) * 0.3;
  parts.swirl.rotation = Math.max(0, spin) * 0.35;
  const onYogurt = (x: number, z: number) => FLOOR + yogurtAt(Math.hypot(x, z)) * sink;

  const y0 = plop(f, at.yogurt, 0.16);
  const spoonIn = ramp(f, at.stir - 10, 10, Easing.out(Easing.quad)) * (1 - ramp(f, at.stir + 68, 10, Easing.in(Easing.quad)));
  const spoonAngle = Math.max(0, spin);
  return (
    <>
      <SmallBowl scale={SCALE} />
      {y0.shown && sink > 0.02 && <mesh geometry={parts.yogurt} material={parts.yogurtMaterial} position-y={FLOOR - 0.0005 + y0.y} scale={[(1 + 0.35 * (1 - sink)) * y0.grow, y0.squash * sink * y0.grow, (1 + 0.35 * (1 - sink)) * y0.grow]} castShadow receiveShadow />}
      {DOLLOPS.map((d, i) => {
        const p = plop(f, at[d.key], 0.15);
        if (!p.shown || sink < 0.05) return null;
        const [x, z] = d.at;
        return <mesh key={d.key} geometry={parts.dollops[i].geo} material={parts.dollops[i].material} position={[x, onYogurt(x, z) - 0.0018 + p.y, z]} scale={[p.grow, p.squash * sink * p.grow, p.grow]} castShadow />;
      })}
      {parts.pickles.map((q, i) => {
        const p = plop(f, at.pickles + q.delay, 0.1, 8);
        if (!p.shown || sink < 0.3) return null;
        return <mesh key={`p${i}`} geometry={parts.pickle} material={kit.pickle.material} position={[q.x, onYogurt(q.x, q.z) + 0.0012 + p.y - 0.004 * (1 - sink), q.z]} rotation-y={q.yaw} scale={p.grow} castShadow />;
      })}
      {f >= at.juice - 8 && f < at.juice + 2 && (
        <mesh position={[0.007, onYogurt(0.007, 0.011) + 0.05, 0.011]} material={parts.juice}>
          <cylinderGeometry args={[0.0011, 0.0011, 0.1, 8]} />
        </mesh>
      )}
      {f >= at.juice && sink > 0.3 && (
        <mesh position={[0.007, onYogurt(0.007, 0.011) + 0.0008, 0.011]} rotation-x={-Math.PI / 2} scale={ramp(f, at.juice, 8, Easing.out(Easing.quad))} material={parts.juice}>
          <circleGeometry args={[0.008, 24]} />
        </mesh>
      )}
      {(
        [
          ["g", parts.garlicSpecks, parts.garlic, at.garlic],
          ["r", parts.paprikaSpecks, parts.paprika, at.paprika],
        ] as const
      ).map(([id, specks, material, land]) =>
        specks.map((q, i) => {
          const p = plop(f, land + q.delay, 0.09, 7);
          if (!p.shown || sink < 0.35) return null;
          return <mesh key={`${id}${i}`} geometry={parts.speck} material={material} position={[q.x, onYogurt(q.x, q.z) + 0.0003 + p.y, q.z]} rotation-y={q.yaw} scale={p.grow} />;
        }),
      )}
      {stir > 0 && (
        <mesh
          geometry={parts.disc}
          position-y={surfaceY}
          rotation-x={-Math.PI / 2}
          scale={((radiusAt(surfaceY) - 0.0008) / (radiusAt(FILL) - 0.0008)) * mix(0.68, 1, ramp(stir, 0, 0.15))}
          material={parts.surface.done(1 - ramp(stir, 0.4, 0.55, Easing.inOut(Easing.sin)))}
          receiveShadow
        />
      )}
      {spoonIn > 0 && (
        <Spoon position={[Math.cos(spoonAngle) * 0.017, FILL - 0.005 + (1 - spoonIn) * 0.12, Math.sin(spoonAngle) * 0.017]} rotation-y={Math.PI - spoonAngle} />
      )}
    </>
  );
}

function Bench({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  // Wide: the bowl sits left of the ingredient list. Tall: it sits above the list.
  const { position, target } = s.tall ? aim([0, 0.014, 0], mix(-0.12, 0.06, t), 1.0, mix(0.34, 0.32, t), 0, -0.085) : aim([0, 0.014, 0], mix(-0.12, 0.06, t), 1.0, mix(0.34, 0.31, t), 0.055);
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      <KitProvider>
        <Sauce s={s} />
      </KitProvider>
    </Stage>
  );
}

export function SauceScene({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const at = landings(s.beats);
  const row = (amount: string, name: string, when: number) => ({ amount, name, show: ramp(f, when - 8, 12, Easing.out(Easing.cubic)) });
  return (
    <>
      <Bench s={s} />
      <IngredientList
        rows={[
          row("3 TBSP", "Greek yogurt", at.yogurt),
          row("1 TSP", "Mayo", at.mayo),
          row("1 TSP", "Ketchup", at.ketchup),
          row("1 TSP", "Yellow mustard", at.mustard),
          row("1 TBSP", "Chopped pickles", at.pickles),
          row("1 TSP", "Pickle juice", at.juice),
          row("PINCH", "Garlic powder", at.garlic),
          row("PINCH", "Smoked paprika", at.paprika),
        ]}
      />
    </>
  );
}
