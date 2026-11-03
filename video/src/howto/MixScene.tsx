// The mix template (docs/adr/0004-recipe-video-scene-files.md): each ingredient drops
// into a small bowl on the line that names it, and a list on the right grows with its
// amount. The first is the base, a soft mound the rest land on: dollops, chopped pieces,
// a pour, and spices. Then a spoon stirs it all (step "stir") from white with ribbons of
// color to the scene's stirred color.
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
import type { MixIngredient, Planned, SceneData } from "./scenes";
import { Shot, Stage, aim, plop, ramp, type SceneProps, type TemplateProps } from "./stage";

type MixData = Extract<SceneData, { template: "mix" }>;

const SCALE = 0.42;
const { floor: FLOOR, radiusAt } = smallBowlInside(SCALE);
const BASE = { r: 0.03, h: 0.017 };
const FILL = FLOOR + 0.0085; // the stirred mix's surface

/** The base's surface height above the floor at a distance from the middle. */
const baseAt = (d: number) => BASE.h * Math.sqrt(Math.max(0, 1 - (d / BASE.r) ** 2.5));

/** Where dollops sit on the base, in the order they go in, and their size. */
const DOLLOPS = [
  { at: [-0.012, 0.009], r: 0.0105, h: 0.0055 },
  { at: [0.013, 0.004], r: 0.01, h: 0.006 },
  { at: [0.0, -0.014], r: 0.0095, h: 0.005 },
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

/** The ingredients by how they go in, each with the frame it lands on. */
function sorted(scene: MixData, p: Planned) {
  const of = (kind: MixIngredient["as"]) => scene.ingredients.filter((r) => r.as === kind).map((r) => ({ ...r, land: p.frame(r.lands) }));
  return { base: of("base")[0], dollops: of("dollop"), pieces: of("pieces")[0], pour: of("pour")[0], specks: of("specks") };
}

function Mix({ scene, p }: { scene: MixData; p: Planned }) {
  const f = useCurrentFrame();
  const at = sorted(scene, p);
  const kit = useKit();
  const parts = useMemo(() => {
    const swirl = swirlTexture();
    swirl.center.set(0.5, 0.5);
    return {
      base: moundGeometry(BASE.r, BASE.h, 0.25),
      dollops: at.dollops.map((d, i) => ({ geo: moundGeometry(DOLLOPS[i].r, DOLLOPS[i].h, 0.4), material: new THREE.MeshPhysicalMaterial({ color: d.color, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.1 }) })),
      baseMaterial: new THREE.MeshPhysicalMaterial({ color: "#F5F2EA", roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
      piece: new RoundedBoxGeometry(0.0046, 0.0042, 0.0046, 2, 0.0008),
      speck: new THREE.BoxGeometry(0.0013, 0.0004, 0.0013),
      speckMaterials: at.specks.map((sp) => new THREE.MeshStandardMaterial({ color: sp.color, roughness: 0.8 })),
      pour: new THREE.MeshPhysicalMaterial({ color: at.pour?.color, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.65 }),
      swirl,
      disc: new THREE.CircleGeometry(radiusAt(FILL) - 0.0008, 64),
      surface: cookable(new THREE.MeshPhysicalMaterial({ map: swirl, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.1 }), scene.color, 0.12),
      pieces: scatter(5, 10, 0.021),
      specks: at.specks.map((_, i) => scatter(6 + i, 46, 0.025)),
    };
    // The scene's data is fixed for the whole render, so these are built once.
  }, []);

  const stirAt = p.at.stir;
  const stir = ramp(f, stirAt, 66, Easing.inOut(Easing.sin));
  const sink = 1 - ramp(stir, 0, 0.55, Easing.linear); // how much of the mounds is left
  const surfaceY = mix(FLOOR + 0.003, FILL, ramp(stir, 0, 0.4, Easing.out(Easing.quad)));
  const spin = (f - stirAt) * 0.3;
  parts.swirl.rotation = Math.max(0, spin) * 0.35;
  const onBase = (x: number, z: number) => FLOOR + baseAt(Math.hypot(x, z)) * sink;

  const y0 = plop(f, at.base.land, 0.16);
  const spoonIn = ramp(f, stirAt - 10, 10, Easing.out(Easing.quad)) * (1 - ramp(f, stirAt + 68, 10, Easing.in(Easing.quad)));
  const spoonAngle = Math.max(0, spin);
  const pour = at.pour?.land;
  return (
    <>
      <SmallBowl scale={SCALE} />
      {y0.shown && sink > 0.02 && <mesh geometry={parts.base} material={parts.baseMaterial} position-y={FLOOR - 0.0005 + y0.y} scale={[(1 + 0.35 * (1 - sink)) * y0.grow, y0.squash * sink * y0.grow, (1 + 0.35 * (1 - sink)) * y0.grow]} castShadow receiveShadow />}
      {at.dollops.map((d, i) => {
        const q = plop(f, d.land, 0.15);
        if (!q.shown || sink < 0.05) return null;
        const [x, z] = DOLLOPS[i].at;
        return <mesh key={i} geometry={parts.dollops[i].geo} material={parts.dollops[i].material} position={[x, onBase(x, z) - 0.0018 + q.y, z]} scale={[q.grow, q.squash * sink * q.grow, q.grow]} castShadow />;
      })}
      {at.pieces &&
        parts.pieces.map((q, i) => {
          const d = plop(f, at.pieces.land + q.delay, 0.1, 8);
          if (!d.shown || sink < 0.3) return null;
          return <mesh key={`p${i}`} geometry={parts.piece} material={kit[at.pieces.piece ?? "pickle"].material} position={[q.x, onBase(q.x, q.z) + 0.0012 + d.y - 0.004 * (1 - sink), q.z]} rotation-y={q.yaw} scale={d.grow} castShadow />;
        })}
      {pour !== undefined && f >= pour - 8 && f < pour + 2 && (
        <mesh position={[0.007, onBase(0.007, 0.011) + 0.05, 0.011]} material={parts.pour}>
          <cylinderGeometry args={[0.0011, 0.0011, 0.1, 8]} />
        </mesh>
      )}
      {pour !== undefined && f >= pour && sink > 0.3 && (
        <mesh position={[0.007, onBase(0.007, 0.011) + 0.0008, 0.011]} rotation-x={-Math.PI / 2} scale={ramp(f, pour, 8, Easing.out(Easing.quad))} material={parts.pour}>
          <circleGeometry args={[0.008, 24]} />
        </mesh>
      )}
      {at.specks.map((sp, k) =>
        parts.specks[k].map((q, i) => {
          const d = plop(f, sp.land + q.delay, 0.09, 7);
          if (!d.shown || sink < 0.35) return null;
          return <mesh key={`${k}-${i}`} geometry={parts.speck} material={parts.speckMaterials[k]} position={[q.x, onBase(q.x, q.z) + 0.0003 + d.y, q.z]} rotation-y={q.yaw} scale={d.grow} />;
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

function Bench({ s, scene, p }: { s: SceneProps; scene: MixData; p: Planned }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  // Wide: the bowl sits left of the ingredient list. Tall: it sits above the list.
  const { position, target } = s.tall ? aim([0, 0.014, 0], mix(-0.12, 0.06, t), 1.0, mix(0.34, 0.32, t), 0, -0.085) : aim([0, 0.014, 0], mix(-0.12, 0.06, t), 1.0, mix(0.34, 0.31, t), 0.055);
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      <KitProvider>
        <Mix scene={scene} p={p} />
      </KitProvider>
    </Stage>
  );
}

export function MixScene({ s, p }: TemplateProps) {
  const f = useCurrentFrame();
  const scene = p.scene as MixData;
  return (
    <>
      <Bench s={s} scene={scene} p={p} />
      <IngredientList rows={scene.ingredients.map((r) => ({ amount: r.amount, name: r.name, show: ramp(f, p.frame(r.lands) - 8, 12, Easing.out(Easing.cubic)) }))} />
    </>
  );
}
