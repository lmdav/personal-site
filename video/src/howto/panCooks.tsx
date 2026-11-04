// Three more ways the skillet template cooks (docs/adr/0004-recipe-video-scene-files.md).
// sear: a raw steak waits on a plate beside the pan while the pan smokes ("heat"), moves into
// the pan ("add"), gets a flip ("flip"), and lifts out to rest ("out"). char: florets land ("add"), a lid goes on over the steam ("cover"),
// and comes off so they blacken at the edges ("uncover"). eggs, in the small nonstick pan:
// two eggs go in and the whites set ("crack"), sauce pours around them and a spoon bastes
// the whites until they gloss ("pour"), and the spoon lifts away with the heat off ("off").
import { useMemo } from "react";
import { Easing, useCurrentFrame } from "remotion";
import { mix } from "../three/bowlShot";
import { Steam } from "../three/cooking";
import { Lid, PLATE_TOP, Plate, SKILLET, SMALL_PAN, Spoon } from "../three/cookware";
import { EGG, STEAK, broccoliMaterial } from "../three/foods";
import { useKit } from "../three/ingredients";
import { rng } from "../geo";
import type { SceneData } from "./scenes";
import { panLayout } from "./skillet";
import { plop, ramp } from "./stage";

const FLOOR = SKILLET.floor;
type Char = Extract<SceneData, { template: "skillet"; cook: "char" }>;
/** Where the plate sits beside the pan, along x. */
export const PLATE_X = -0.34;

export function Sear({ at }: { at: Record<string, number> }) {
  const f = useCurrentFrame();
  const kit = useKit();
  const steak = kit.foods().steak;
  const top = useMemo(() => steak.searing(), [steak]);
  const hop = ramp(f, at.add - 24, 24, Easing.inOut(Easing.cubic));
  const onPlate = PLATE_TOP + STEAK.height / 2;
  const inPan = FLOOR + STEAK.height / 2;
  const flip = ramp(f, at.flip, 18, Easing.inOut(Easing.cubic)) * Math.PI;
  const flipped = flip > Math.PI / 2;
  const leave = ramp(f, at.out, 20, Easing.in(Easing.quad));
  const y = mix(onPlate, inPan, hop) + 0.12 * Math.sin(hop * Math.PI) + 0.05 * Math.sin(flip) + 0.5 * leave;
  const smoke = ramp(f, at.heat, 30) * (1 - ramp(f, at.add + 6, 20));
  const sizzle = ramp(f, at.add + 8, 20) * 0.7 * (1 - leave);
  return (
    <>
      <Plate position={[PLATE_X, 0, 0]} />
      <group position={[mix(PLATE_X, 0, hop), y, 0]} rotation-x={flipped ? flip - Math.PI : flip}>
        {/* The side that went down first comes up seared. The other side browns a little while it waits. */}
        <mesh
          geometry={steak.whole}
          material={flipped ? [steak.seared, steak.searedSide] : [top.done(ramp(f, at.add + 20, at.flip - at.add, Easing.linear) * 0.22), f > at.add ? steak.searedSide : steak.rawSide]}
          castShadow
          receiveShadow
        />
      </group>
      <Steam from={[[-0.05, FLOOR, 0.03], [0.05, FLOOR, -0.03], [0.0, FLOOR, 0.05], [0.0, FLOOR, -0.05]]} frame={f} amount={Math.max(smoke, sizzle)} spread={0.06} rise={0.16} />
    </>
  );
}

export function Char({ scene, at }: { scene: Char; at: Record<string, number> }) {
  const f = useCurrentFrame();
  const kit = useKit();
  const broccoli = kit.foods().broccoli;
  const { layout, cook } = useMemo(() => ({ layout: panLayout(scene.food), cook: broccoliMaterial() }), [scene]);
  const material = cook.done(0.3 * ramp(f, at.cover, at.uncover - at.cover, Easing.linear) + 0.7 * ramp(f, at.uncover, 56, Easing.inOut(Easing.sin)));
  const lower = ramp(f, at.cover - 10, 12, Easing.inOut(Easing.cubic));
  const raise = ramp(f, at.uncover - 2, 14, Easing.inOut(Easing.cubic));
  const lidHeight = 0.05 + 0.32 * (1 - lower) + 0.42 * raise;
  const under = ramp(f, at.cover - 4, 10) * (1 - raise);
  return (
    <>
      {layout.map((p, i) => {
        const drop = plop(f, at.add + i * 2, 0.16, 9);
        if (!drop.shown) return null;
        return (
          <group key={i} position={[p.x, FLOOR + 0.0165 + drop.y, p.z]} rotation-y={p.yaw} scale={drop.grow}>
            <mesh geometry={broccoli.geos[p.variant % broccoli.geos.length]} material={material} rotation-z={1.25 + (p.drift % 0.5)} castShadow receiveShadow />
          </group>
        );
      })}
      {(lower > 0 && raise < 1) && <Lid radius={0.128} position-y={lidHeight} />}
      <Steam from={[[-0.06, FLOOR, 0.04], [0.06, FLOOR, -0.04], [0.0, FLOOR, 0.0], [0.05, FLOOR, 0.06]]} frame={f} amount={Math.max(under * 0.5, raise * (1 - ramp(f, at.uncover + 24, 30)))} spread={0.08} rise={0.2} />
    </>
  );
}

const PAN = FLOOR * SMALL_PAN;
const SPOTS = [[-0.033, 0.003, 0.4], [0.034, -0.005, 2.6]] as const;
const WHITE = 0.84; // the eggs sit a little smaller than life, to fit the small pan

export function Eggs({ at }: { at: Record<string, number> }) {
  const f = useCurrentFrame();
  const kit = useKit();
  const egg = kit.foods().egg;
  const parts = useMemo(() => {
    const whites = SPOTS.map(() => egg.glazing());
    for (const w of whites) w.material.transparent = true;
    const r = rng(29);
    return { whites, drops: Array.from({ length: 3 }, () => r() * 6) };
  }, [egg]);
  const pour = ramp(f, at.pour, 22, Easing.out(Easing.cubic));
  const stream = f >= at.pour - 2 && f < at.pour + 22;
  const glaze = ramp(f, at.pour + 16, Math.min(at.off - at.pour - 16, 120), Easing.inOut(Easing.sin));
  const spoonIn = ramp(f, at.pour + 18, 10) * (1 - ramp(f, at.off - 10, 10));
  const spoonAngle = (f - at.pour) * 0.13;
  return (
    <>
      <mesh position-y={PAN + 0.0006} rotation-x={-Math.PI / 2} scale={Math.max(pour, 0.001)} receiveShadow>
        <circleGeometry args={[0.062, 64]} />
        <meshPhysicalMaterial color="#3A1B0B" roughness={0.16} clearcoat={1} clearcoatRoughness={0.06} />
      </mesh>
      {stream && (
        <mesh position={[0.002, PAN + 0.11, 0.048]} castShadow>
          <cylinderGeometry args={[0.0022, 0.003, 0.22, 12]} />
          <meshPhysicalMaterial color="#3A1B0B" roughness={0.2} clearcoat={1} />
        </mesh>
      )}
      {SPOTS.map(([x, z, turn], k) => {
        const drop = plop(f, at.crack + k * 8, 0.1, 8);
        if (!drop.shown) return null;
        const spread = 0.55 + 0.45 * ramp(f, at.crack + k * 8, 12, Easing.out(Easing.cubic));
        const set = ramp(f, at.crack + k * 8 + 8, at.pour - at.crack - 16, Easing.inOut(Easing.sin));
        const white = parts.whites[k];
        white.material.opacity = mix(0.62, 1, set);
        return (
          <group key={k} position={[x, PAN + 0.0012, z]} rotation-y={turn} scale={WHITE}>
            <mesh geometry={egg.whites[k]} material={white.done(glaze)} scale={[spread, 1, spread]} castShadow receiveShadow />
            <mesh geometry={egg.yolk} material={egg.yolkMaterial} position={[EGG.yolkAt[0], 0.0046 + drop.y, EGG.yolkAt[1]]} scale={[1, drop.squash, 1]} castShadow />
          </group>
        );
      })}
      {spoonIn > 0 && <Spoon position={[0.034 + 0.02 * Math.cos(spoonAngle), PAN + 0.012 + 0.09 * (1 - spoonIn), -0.005 + 0.016 * Math.sin(spoonAngle)]} rotation-y={Math.PI} scale={0.9} />}
      <Steam from={[[-0.03, PAN, 0.0], [0.03, PAN, 0.0]]} frame={f} amount={ramp(f, at.crack + 20, 30) * 0.5 + ramp(f, at.pour, 14) * 0.4} spread={0.03} rise={0.1} />
    </>
  );
}
