// The ingredient kit: one 3D piece per kind of food, at real size in meters, centered on
// the physics collider the bake uses for it (src/recipes/*.build.json). Photo-surfaced
// where a real photo exists (patty crust, smashed potatoes, romaine); painted otherwise.
import { useTexture } from "@react-three/drei";
import React, { createContext, useContext, useMemo } from "react";
import { staticFile } from "remotion";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../geo";
import { cheeseShape } from "./cooking";
import { EGG, buildFoods } from "./foods";
import { mushroomTexture, pickleTexture, tomatoTexture } from "./paint";
import { reliefGeometry } from "./relief";

export type Kind = "leaf" | "tomato" | "onion" | "pickle" | "potato" | "patty" | "mushroom" | "onionSlice" | "steak" | "broccoli" | "avocado" | "egg" | "rice";

const POTATO_PHOTOS = [0, 1, 3];

/* Geometry ---------------------------------------------------------- */

/** A smash patty, drawn flat: a lacy, ragged outline filled with the real crust photo,
 * darker and crisper toward the edge. reliefGeometry turns it into the 3D patty. */
function pattyImage(crust: CanvasImageSource, seed: number) {
  const r = rng(seed);
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const ph = r() * 6;
  g.beginPath();
  for (let k = 0; k <= 220; k++) {
    const a = (k / 220) * Math.PI * 2;
    const spike = r() > 0.86 ? 0.05 + 0.05 * r() : 0;
    const rad = 205 * (1 + 0.035 * Math.sin(a * 3 + ph) + 0.025 * Math.sin(a * 8 + 2 * ph) + 0.03 * (r() - 0.5) + spike);
    if (k === 0) g.moveTo(256 + Math.cos(a) * rad, 256 + Math.sin(a) * rad);
    else g.lineTo(256 + Math.cos(a) * rad, 256 + Math.sin(a) * rad);
  }
  g.fillStyle = "#fff";
  g.fill();
  g.globalCompositeOperation = "source-in";
  g.drawImage(crust, 0, 0, 512, 512);
  g.globalCompositeOperation = "source-atop";
  const edge = g.createRadialGradient(256, 256, 120, 256, 256, 250);
  edge.addColorStop(0, "rgba(40, 20, 8, 0)");
  edge.addColorStop(0.75, "rgba(40, 20, 8, 0.25)");
  edge.addColorStop(1, "rgba(30, 14, 4, 0.7)");
  g.fillStyle = edge;
  g.fillRect(0, 0, 512, 512);
  return c;
}

/** A chopped piece of romaine: a curled, crinkled patch cut from the leaf photo. */
function leafGeometry(seed: number) {
  const r = rng(seed);
  const w = 0.05;
  const h = 0.034;
  const geo = new THREE.PlaneGeometry(w, h, 20, 14);
  geo.rotateX(-Math.PI / 2);
  geo.setAttribute("uv1", geo.attributes.uv.clone());
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const u0 = 0.04 + 0.5 * r();
  const v0 = 0.12 + 0.4 * r();
  const arch = (r() < 0.5 ? 1 : -1) * (0.003 + 0.003 * r());
  const ph2 = r() * 6;
  const ph = r() * 6;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    const z = pos.getZ(i) / (h / 2);
    const crinkle = 0.0013 * Math.sin(x * 9 + ph) * Math.abs(z) + 0.0008 * Math.sin(z * 11 + x * 6 + ph2);
    pos.setY(i, arch * (1 - x * x) + 0.003 * z * z + crinkle);
    uv.setXY(i, u0 + uv.getX(i) * 0.2, v0 + uv.getY(i) * 0.34);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A torn, ragged outline for a piece of chopped lettuce, as a mask (white keeps). */
function tornMask(seed: number) {
  const r = rng(seed);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 256);
  const lobes = [r() * 6, r() * 6, r() * 6];
  g.beginPath();
  for (let k = 0; k <= 120; k++) {
    const a = (k / 120) * Math.PI * 2;
    const rad = 0.43 + 0.05 * Math.sin(a * 2 + lobes[0]) + 0.035 * Math.sin(a * 5 + lobes[1]) + 0.02 * Math.sin(a * 11 + lobes[2]) + 0.025 * (r() - 0.5);
    const x = 128 + Math.cos(a) * rad * 256;
    const y = 128 + Math.sin(a) * rad * 256;
    if (k === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.fillStyle = "#fff";
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.channel = 1;
  return t;
}

/** A diced tomato piece: a rounded cube, knocked a little out of square. */
function tomatoGeometry(seed: number) {
  const r = rng(seed);
  const geo = new RoundedBoxGeometry(0.012, 0.011, 0.012, 3, 0.0024);
  const pos = geo.attributes.position;
  const s = [0.85 + 0.3 * r(), 0.8 + 0.3 * r(), 0.85 + 0.3 * r()];
  const ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 0.0007 * Math.sin(x * 500 + ph[0]) * Math.cos(z * 450 + ph[1]) + 0.0005 * Math.sin(y * 600 + ph[2]);
    pos.setXYZ(i, x * s[0] + n, y * s[1] + n, z * s[2] - n);
  }
  geo.computeVertexNormals();
  return geo;
}

/** The outline of a mushroom slice cut through cap and stem, in unit coordinates. */
type PathLike = {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): unknown;
  bezierCurveTo(ax: number, ay: number, bx: number, by: number, x: number, y: number): unknown;
};
function mushroomOutline(p: PathLike) {
  p.moveTo(-0.5, 0);
  p.bezierCurveTo(-0.52, 0.3, -0.25, 0.45, 0, 0.45);
  p.bezierCurveTo(0.25, 0.45, 0.52, 0.3, 0.5, 0);
  p.quadraticCurveTo(0.35, -0.04, 0.16, -0.03);
  p.lineTo(0.13, -0.42);
  p.quadraticCurveTo(0, -0.46, -0.13, -0.42);
  p.lineTo(-0.16, -0.03);
  p.quadraticCurveTo(-0.35, -0.04, -0.5, 0);
}

/** A slice from the side of the cap, which has no stem. */
function capOutline(p: PathLike) {
  p.moveTo(-0.46, 0.02);
  p.bezierCurveTo(-0.46, 0.3, -0.22, 0.4, 0, 0.4);
  p.bezierCurveTo(0.22, 0.4, 0.46, 0.3, 0.46, 0.02);
  p.quadraticCurveTo(0, 0.1, -0.46, 0.02);
}

function mushroomGeometry(outline: (p: PathLike) => void) {
  const shape = new THREE.Shape();
  outline(shape);
  const depth = 0.07;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  geo.rotateX(-Math.PI / 2);
  geo.scale(0.036, 0.036, 0.036);
  return geo;
}

function paintMushroom(g: CanvasRenderingContext2D) {
  const m = (x: number, y: number): [number, number] => [(x + 0.5) * 512, (0.5 - y) * 512];
  g.beginPath();
  mushroomOutline({
    moveTo: (x, y) => g.moveTo(...m(x, y)),
    lineTo: (x, y) => g.lineTo(...m(x, y)),
    quadraticCurveTo: (cx, cy, x, y) => g.quadraticCurveTo(...m(cx, cy), ...m(x, y)),
    bezierCurveTo: (ax, ay, bx, by, x, y) => g.bezierCurveTo(...m(ax, ay), ...m(bx, by), ...m(x, y)),
  });
  g.closePath();
}

/** A caramelized onion slice: a flattened arc. */
function onionSliceGeometry() {
  const geo = new THREE.TorusGeometry(0.0105, 0.0022, 8, 24, 2.3);
  geo.rotateX(Math.PI / 2);
  geo.scale(1, 0.7, 1);
  geo.center();
  return geo;
}

/** A crinkle-cut pickle chip. */
function pickleGeometry() {
  const geo = new THREE.CylinderGeometry(0.014, 0.014, 0.004, 64, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = 1 + 0.045 * Math.sin(Math.atan2(z, x) * 14);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/* The kit ----------------------------------------------------------- */

type Kit = ReturnType<typeof buildKit>;
const KitContext = createContext<Kit | null>(null);

function buildKit(photos: { patty: THREE.Texture; leaf: THREE.Texture; potatoes: THREE.Texture[] }) {
  for (const t of [photos.patty, photos.leaf, ...photos.potatoes]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  }
  const mushroomMap = mushroomTexture(paintMushroom);
  mushroomMap.offset.set(0.5, 0.5);
  let foods: ReturnType<typeof buildFoods> | undefined;
  return {
    /** The rice-bowl foods (foods.ts), built the first time something asks. */
    foods: () => (foods ??= buildFoods(photos.patty)),
    leaf: {
      geos: Array.from({ length: 30 }, (_, i) => leafGeometry(100 + i)),
      materials: [0, 1, 2, 3].map(
        (i) => new THREE.MeshPhysicalMaterial({ map: photos.leaf, alphaMap: tornMask(200 + i), alphaTest: 0.6, side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
      ),
    },
    tomato: {
      geos: [0, 1, 2, 3].map((i) => tomatoGeometry(300 + i)),
      material: new THREE.MeshPhysicalMaterial({ map: tomatoTexture(), color: "#F2D8D0", roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
    },
    onion: {
      geo: new RoundedBoxGeometry(0.007, 0.006, 0.007, 2, 0.0012),
      material: new THREE.MeshPhysicalMaterial({ color: "#E9E3D2", roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    },
    pickle: {
      geo: pickleGeometry(),
      material: new THREE.MeshPhysicalMaterial({ map: pickleTexture(), roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    },
    potato: POTATO_PHOTOS.map((p, i) => ({
      geo: reliefGeometry(photos.potatoes[i].image as CanvasImageSource, { grid: 128, size: 0.064, top: 0.0072, bottom: 0.0058, edge: 0.14, relief: 0.003 }),
      material: new THREE.MeshStandardMaterial({ map: photos.potatoes[i], bumpMap: photos.potatoes[i], bumpScale: 1.2, roughness: 0.5 }),
    })),
    patty: [0, 1].map((i) => {
      const image = pattyImage(photos.patty.image as CanvasImageSource, 31 + i);
      const map = new THREE.CanvasTexture(image);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
      return {
        geo: reliefGeometry(image, { grid: 160, size: 0.094, top: 0.0045, bottom: 0.0035, edge: 0.16, relief: 0.0015 }),
        material: new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.5, roughness: 0.46 }),
        cheese: cheeseShape(0.062, 0.044, 0.4 + i * 0.9),
      };
    }),
    cheeseMaterial: new THREE.MeshPhysicalMaterial({ color: "#F3B533", roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color("#FFE2A0"), side: THREE.DoubleSide }),
    mushroom: {
      geos: [mushroomGeometry(mushroomOutline), mushroomGeometry(capOutline), mushroomGeometry(capOutline)],
      material: new THREE.MeshPhysicalMaterial({ map: mushroomMap, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    },
    onionSlice: {
      geo: onionSliceGeometry(),
      material: new THREE.MeshPhysicalMaterial({ color: "#C98B42", roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.2 }),
    },
  };
}

export function KitProvider({ children }: { children: React.ReactNode }) {
  const [patty, leaf, ...potatoes] = useTexture([
    staticFile("textures/patty.jpg"),
    staticFile("textures/leaf.png"),
    ...POTATO_PHOTOS.map((i) => staticFile(`textures/potato_${i}.png`)),
  ]);
  const kit = useMemo(() => buildKit({ patty, leaf, potatoes }), [patty, leaf, potatoes]);
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>;
}

export const useKit = () => useContext(KitContext)!;

/** One piece of food of the given kind, centered on its collider. */
export function pieceObject(kit: Kit, kind: Kind, variant: number, rice?: number[][]): THREE.Object3D {
  const mesh = (geo: THREE.BufferGeometry, material: THREE.Material) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const jitter = 0.88 + 0.24 * rng(variant * 7 + 3)();
  const scaled = (m: THREE.Mesh) => (m.scale.setScalar(jitter), m);
  switch (kind) {
    case "leaf":
      return mesh(kit.leaf.geos[variant % kit.leaf.geos.length], kit.leaf.materials[variant % kit.leaf.materials.length]);
    case "tomato":
      return scaled(mesh(kit.tomato.geos[variant % kit.tomato.geos.length], kit.tomato.material));
    case "onion":
      return scaled(mesh(kit.onion.geo, kit.onion.material));
    case "pickle":
      return mesh(kit.pickle.geo, kit.pickle.material);
    case "potato": {
      const p = kit.potato[variant % kit.potato.length];
      const m = mesh(p.geo, p.material);
      m.position.y = -0.0007;
      return m;
    }
    case "patty": {
      const p = kit.patty[variant % kit.patty.length];
      const group = new THREE.Group();
      const cheese = mesh(p.cheese, kit.cheeseMaterial);
      cheese.position.y = 0.0058;
      group.add(mesh(p.geo, p.material), cheese);
      return group;
    }
    case "mushroom":
      return scaled(mesh(kit.mushroom.geos[variant % kit.mushroom.geos.length], kit.mushroom.material));
    case "onionSlice":
      return scaled(mesh(kit.onionSlice.geo, kit.onionSlice.material));
    case "steak": {
      const { strips, stripMaterials } = kit.foods().steak;
      const m = new THREE.Mesh(strips[variant % strips.length], stripMaterials);
      m.castShadow = m.receiveShadow = true;
      return m;
    }
    case "broccoli": {
      const { geos, cooked, proxy, hidden } = kit.foods().broccoli;
      const group = new THREE.Group();
      const m = mesh(geos[variant % geos.length], cooked.material);
      // Rays for the sauce and seeds hit a simple stand-in, not the tens of thousands of buds.
      m.raycast = () => {};
      const stand = new THREE.Mesh(proxy, hidden);
      stand.visible = false;
      group.add(m, stand);
      group.scale.setScalar(jitter);
      return group;
    }
    case "avocado": {
      const { geo, material } = kit.foods().avocado;
      return scaled(mesh(geo, material));
    }
    case "egg": {
      const { whites, white, yolk, yolkMaterial } = kit.foods().egg;
      const group = new THREE.Group();
      const w = mesh(whites[variant % whites.length], white);
      w.position.y = -0.0035;
      const y = mesh(yolk, yolkMaterial);
      y.position.set(EGG.yolkAt[0], 0.0012, EGG.yolkAt[1]);
      group.add(w, y);
      group.scale.set(0.82, 1, 0.82);
      return group;
    }
    case "rice":
      if (!rice) throw new Error("The rice piece needs its profile from the build file (kinds.rice.lathe)");
      return kit.foods().riceBed(rice, 7000);
  }
}

export function Piece({ kind, variant, rice }: { kind: Kind; variant: number; rice?: number[][] }) {
  const kit = useKit();
  const object = useMemo(() => pieceObject(kit, kind, variant, rice), [kit, kind, variant, rice]);
  return <primitive object={object} />;
}
