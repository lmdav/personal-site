// The board template (docs/adr/0004-recipe-video-scene-files.md): food on the cutting board,
// whole until its cut starts. A knife then walks along it, one slice at a time, and the
// slices fan over to show their cut faces. In the vertical cut the set turns a quarter turn,
// so the board runs up the frame.
import { useMemo } from "react";
import { Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { mix } from "../three/bowlShot";
import { Knife } from "../three/cookware";
import { STEAK } from "../three/foods";
import { KitProvider, useKit } from "../three/ingredients";
import { Prop, Studio } from "../three/Studio";
import { CUT_FRAMES, FAN_FRAMES, SLICES_OF, type BoardFood, type SceneData } from "./scenes";
import { Shot, Stage, aim, ramp, type SceneProps, type TemplateProps } from "./stage";

const TOP = 0.0413; // the cutting board's surface
// A slice's box, standing: its length runs along the board's depth, its cut face toward the
// next slice, and its seared side up.
const STAND = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)));
const Z = new THREE.Vector3(0, 0, 1);

/** Slice k of n: standing in its place, then tipped over by fan (0 to 1). */
function slicePose(x: number, k: number, n: number, gap: number, spread: number, tip: number, fan: number, height: number) {
  const q = new THREE.Quaternion().setFromAxisAngle(Z, -tip * fan).multiply(STAND);
  const across = (k - (n - 1) / 2) * (gap + spread * fan);
  return { position: [x + across, TOP + height / 2 - (height / 2 - 0.006) * fan * 0.8, 0] as [number, number, number], quaternion: q };
}

function Food({ food }: { food: BoardFood & { at: number } }) {
  const f = useCurrentFrame();
  const foods = useKit().foods();
  const n = SLICES_OF[food.food];
  const end = food.at + n * CUT_FRAMES;
  const fan = ramp(f, end + 2, FAN_FRAMES, Easing.inOut(Easing.cubic));
  if (food.food === "steak") {
    const { whole, seared, searedSide, strips, stripMaterials } = foods.steak;
    if (f < food.at) return <mesh geometry={whole} material={[seared, searedSide]} position={[food.x, TOP + STEAK.height / 2, 0]} castShadow receiveShadow />;
    return (
      <>
        {Array.from({ length: n }, (_, k) => {
          const { position, quaternion } = slicePose(food.x, k, n, STEAK.strip, 0.0038, 1.05, fan, STEAK.height);
          return <mesh key={k} geometry={strips[k % strips.length]} material={stripMaterials} position={position} quaternion={quaternion} castShadow receiveShadow />;
        })}
      </>
    );
  }
  const { geo, material, width } = foods.avocado;
  return (
    <>
      {Array.from({ length: n }, (_, k) => {
        const s = Math.sin((Math.PI * (k + 0.75)) / (n + 0.5)) ** 0.45;
        const { position, quaternion } = slicePose(food.x, k, n, 0.0068, 0.0065, 1.15, fan, width * s);
        return <mesh key={k} geometry={geo} material={material} position={position} quaternion={quaternion} scale={[s, 1, s]} castShadow receiveShadow />;
      })}
    </>
  );
}

/** Where the knife's edge is, or null while it is away. */
function knifeAt(f: number, foods: (BoardFood & { at: number })[]): [number, number] | null {
  for (const food of foods) {
    const n = SLICES_OF[food.food];
    const end = food.at + n * CUT_FRAMES;
    if (f < food.at - 8 || f > end + 8) continue;
    const gap = food.food === "steak" ? STEAK.strip : 0.0068;
    const k = Math.min(n - 1, Math.max(0, Math.floor((f - food.at) / CUT_FRAMES)));
    const x = food.x + (k - (n - 1) / 2 - 0.5) * gap;
    const local = ((f - food.at) % CUT_FRAMES) / CUT_FRAMES;
    const height = food.food === "steak" ? STEAK.height : 0.024;
    const down = f < food.at || f > end ? 1 : 1 - Math.sin(Math.min(1, Math.max(0, local)) * Math.PI);
    const away = Math.max(1 - ramp(f, food.at - 8, 8), ramp(f, end, 8));
    return [x, TOP + mix(0.002, height + 0.02, down) + 0.3 * away];
  }
  return null;
}

function Set({ s, foods }: { s: SceneProps; foods: (BoardFood & { at: number })[] }) {
  const f = useCurrentFrame();
  const knife = knifeAt(f, foods);
  const t = f / s.len;
  const { position, target } = aim([0, TOP + 0.01, 0], mix(-0.14, 0.08, t), 1.0, 0.56 + (s.tall ? 0.04 : 0));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      <group rotation-y={s.tall ? Math.PI / 2 : 0}>
        <Prop model="wooden_cutting_board" />
        <KitProvider>
          {foods.map((food) => (
            <Food key={food.food} food={food} />
          ))}
        </KitProvider>
        {knife && <Knife position={[knife[0], knife[1], -0.015]} />}
      </group>
    </Stage>
  );
}

export function BoardScene({ s, p }: TemplateProps) {
  const scene = p.scene as Extract<SceneData, { template: "board" }>;
  const foods = useMemo(() => scene.foods.map((food) => ({ ...food, at: p.frame(food.cut) })), [scene, p]);
  return <Set s={s} foods={foods} />;
}
