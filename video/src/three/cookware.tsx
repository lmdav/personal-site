// Cookware for the how-to scenes, at real size in meters: a cast iron skillet (or a small
// nonstick, the same shape scaled down), a pot with a lid, a pan lid, a cup for pressing the
// potatoes, a spatula, a spoon, a fork, a knife, a plate, a square of parchment, and small
// stoneware bowls (the serving bowl, scaled down). Round things are turned on a lathe, like
// the bowl.
import type { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import spec from "../recipes/smash-burger-bowl.build.json";
import { Bowl } from "./Bowl";

type Group = ThreeElements["group"];

function lathe(points: [number, number][], segments = 96) {
  const geo = new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  geo.computeVertexNormals();
  return geo;
}

/** Inside the skillet: the height of its cooking surface and how far out food can sit. */
export const SKILLET = { floor: 0.007, radius: 0.1 };
/** The small nonstick pan is the skillet at this scale. */
export const SMALL_PAN = 0.68;

const SKILLET_PROFILE: [number, number][] = [
  [0.0005, 0], [0.098, 0], [0.104, 0.0012], [0.108, 0.004], [0.111, 0.009], [0.124, 0.044], [0.1265, 0.048],
  [0.1285, 0.0498], [0.1275, 0.0512], [0.1245, 0.0505], [0.1225, 0.0475], [0.1095, 0.0125], [0.106, 0.0085],
  [0.101, 0.007], [0.0005, 0.007],
];

/** A seasoned 10-inch cast iron skillet with its handle pointing along +x. nonstick: a
 * dark coated pan instead (scale it down for a small one). */
export function Skillet({ nonstick = false, ...props }: Group & { nonstick?: boolean }) {
  const { body, handle, lug, iron } = useMemo(
    () => ({
      body: lathe(SKILLET_PROFILE, 128),
      handle: new RoundedBoxGeometry(0.15, 0.014, 0.026, 3, 0.005),
      lug: new RoundedBoxGeometry(0.035, 0.009, 0.045, 3, 0.004),
      iron: nonstick
        ? new THREE.MeshPhysicalMaterial({ color: "#232326", metalness: 0.25, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3, side: THREE.DoubleSide })
        : new THREE.MeshPhysicalMaterial({ color: "#2A2725", metalness: 0.55, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45, side: THREE.DoubleSide }),
    }),
    [nonstick],
  );
  return (
    <group {...props}>
      <mesh geometry={body} material={iron} castShadow receiveShadow />
      <mesh geometry={handle} material={iron} position={[0.195, 0.046, 0]} rotation-z={0.13} castShadow receiveShadow />
      <mesh geometry={lug} material={iron} position={[-0.135, 0.047, 0]} castShadow receiveShadow />
    </group>
  );
}

/** Inside the pot: its floor, inside radius, and rim height. */
export const POT = { floor: 0.006, radius: 0.076, rim: 0.094 };

/** A small stainless saucepan with two side handles, its base at the origin. */
export function Pot(props: Group) {
  const { body, handle, steel } = useMemo(
    () => ({
      body: lathe([[0.0005, 0], [0.078, 0], [0.081, 0.003], [0.082, 0.09], [0.084, POT.rim], [0.08, POT.rim], [POT.radius + 0.002, 0.09], [POT.radius, 0.009], [POT.radius - 0.004, POT.floor], [0.0005, POT.floor]], 96),
      handle: new RoundedBoxGeometry(0.06, 0.012, 0.03, 3, 0.005),
      steel: new THREE.MeshPhysicalMaterial({ color: "#C4C5C7", metalness: 1, roughness: 0.3, side: THREE.DoubleSide }),
    }),
    [],
  );
  return (
    <group {...props}>
      <mesh geometry={body} material={steel} castShadow receiveShadow />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={handle} material={steel} position={[side * 0.108, 0.078, 0]} castShadow />
      ))}
    </group>
  );
}

/** A domed lid with a knob, sitting on its rim at the origin. radius: the rim's radius. */
export function Lid({ radius, ...props }: Group & { radius: number }) {
  const { dome, knob, steel, black } = useMemo(() => {
    const h = radius * 0.24;
    const points: [number, number][] = [[radius, 0]];
    for (let k = 1; k <= 12; k++) points.push([radius * Math.cos((k / 12) * (Math.PI / 2)) + 0.0005, h * Math.sin((k / 12) * (Math.PI / 2))]);
    return {
      dome: lathe(points, 96),
      knob: new THREE.CylinderGeometry(0.013, 0.01, 0.018, 24),
      steel: new THREE.MeshPhysicalMaterial({ color: "#C8C9CB", metalness: 1, roughness: 0.26, side: THREE.DoubleSide }),
      black: new THREE.MeshPhysicalMaterial({ color: "#26221F", roughness: 0.45 }),
    };
  }, [radius]);
  return (
    <group {...props}>
      <mesh geometry={dome} material={steel} castShadow receiveShadow />
      <mesh geometry={knob} material={black} position-y={radius * 0.24 + 0.009} castShadow />
    </group>
  );
}

/** A chef's knife, edge down at the origin, blade along z with the handle toward +z. */
export function Knife(props: Group) {
  const { blade, handle, steel, dark } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.11, 0);
    shape.quadraticCurveTo(-0.02, -0.002, 0.07, 0);
    shape.lineTo(0.07, 0.042);
    shape.lineTo(-0.02, 0.04);
    shape.quadraticCurveTo(-0.08, 0.03, -0.11, 0);
    const blade = new THREE.ExtrudeGeometry(shape, { depth: 0.0016, bevelEnabled: false });
    blade.translate(0, 0, -0.0008);
    blade.rotateY(-Math.PI / 2);
    return {
      blade,
      handle: new RoundedBoxGeometry(0.014, 0.022, 0.1, 3, 0.006),
      steel: new THREE.MeshPhysicalMaterial({ color: "#D3D4D6", metalness: 1, roughness: 0.22 }),
      dark: new THREE.MeshPhysicalMaterial({ color: "#2B2420", roughness: 0.5, clearcoat: 0.3 }),
    };
  }, []);
  return (
    <group {...props}>
      <mesh geometry={blade} material={steel} castShadow />
      <mesh geometry={handle} material={dark} position={[0, 0.03, 0.12]} castShadow />
    </group>
  );
}

/** A plain ceramic cup, upright, with its base at the origin. */
export function Cup(props: Group) {
  const { geo, material } = useMemo(
    () => ({
      geo: lathe([[0.0005, 0], [0.026, 0], [0.028, 0.002], [0.032, 0.08], [0.0335, 0.082], [0.032, 0.0835], [0.0295, 0.081], [0.0255, 0.005], [0.0005, 0.005]]),
      material: new THREE.MeshPhysicalMaterial({ color: "#AEB9A3", roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.15, side: THREE.DoubleSide }),
    }),
    [],
  );
  return (
    <group {...props}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/** A stainless turner. The blade lies flat with its underside at the origin, and the
 * handle rises toward -x. */
export function Spatula(props: Group) {
  const { blade, neck, handle, steel, wood } = useMemo(
    () => ({
      blade: new RoundedBoxGeometry(0.1, 0.002, 0.09, 2, 0.0008),
      neck: new RoundedBoxGeometry(0.06, 0.003, 0.018, 2, 0.001),
      handle: new THREE.CylinderGeometry(0.011, 0.009, 0.12, 24),
      steel: new THREE.MeshPhysicalMaterial({ color: "#C9CACC", metalness: 1, roughness: 0.28 }),
      wood: new THREE.MeshPhysicalMaterial({ color: "#3B2B21", roughness: 0.55, clearcoat: 0.4 }),
    }),
    [],
  );
  return (
    <group {...props}>
      <mesh geometry={blade} material={steel} position-y={0.001} castShadow />
      <mesh geometry={neck} material={steel} position={[-0.072, 0.016, 0]} rotation-z={-0.6} castShadow />
      <mesh geometry={handle} material={wood} position={[-0.14, 0.05, 0]} rotation-z={Math.PI / 2 - 0.45} castShadow />
    </group>
  );
}

/** A teaspoon with the bottom of its bowl at the origin and the handle toward -x. */
export function Spoon(props: Group) {
  const { head, handle, steel } = useMemo(() => {
    const head = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    head.scale(0.02, 0.008, 0.013);
    head.translate(0, 0.008, 0);
    return {
      head,
      handle: new RoundedBoxGeometry(0.13, 0.003, 0.009, 2, 0.0012),
      steel: new THREE.MeshPhysicalMaterial({ color: "#D2D3D5", metalness: 0.9, roughness: 0.32, side: THREE.DoubleSide }),
    };
  }, []);
  return (
    <group {...props}>
      <mesh geometry={head} material={steel} castShadow />
      <mesh geometry={handle} material={steel} position={[-0.078, 0.03, 0]} rotation-z={-0.38} castShadow />
    </group>
  );
}

/** A dinner fork pointing straight down, with its tine tips at the origin. */
export function Fork(props: Group) {
  const { tine, neck, handle, steel } = useMemo(
    () => ({
      tine: new THREE.BoxGeometry(0.0013, 0.022, 0.0013),
      neck: new RoundedBoxGeometry(0.017, 0.012, 0.0022, 2, 0.001),
      handle: new RoundedBoxGeometry(0.012, 0.11, 0.004, 2, 0.0018),
      steel: new THREE.MeshPhysicalMaterial({ color: "#D2D3D5", metalness: 0.9, roughness: 0.3 }),
    }),
    [],
  );
  return (
    <group {...props}>
      {[-0.0057, -0.0019, 0.0019, 0.0057].map((x) => (
        <mesh key={x} geometry={tine} material={steel} position={[x, 0.011, 0]} castShadow />
      ))}
      <mesh geometry={neck} material={steel} position-y={0.027} castShadow />
      <mesh geometry={handle} material={steel} position-y={0.088} castShadow />
    </group>
  );
}

/** A white dinner plate. Food sits on it at PLATE_TOP. */
export const PLATE_TOP = 0.0075;
export function Plate(props: Group) {
  const { geo, material } = useMemo(
    () => ({
      geo: lathe([[0.0005, 0], [0.06, 0], [0.062, 0.004], [0.08, 0.006], [0.108, 0.016], [0.112, 0.018], [0.114, 0.016], [0.11, 0.013], [0.08, 0.0085], [0.06, PLATE_TOP], [0.0005, PLATE_TOP]], 96),
      material: new THREE.MeshPhysicalMaterial({ color: "#F4F1EA", roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide }),
    }),
    [],
  );
  return (
    <group {...props}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/** A square of parchment paper, flat, with a gentle curl at the corners. */
export function Parchment({ size = 0.1, opacity = 1, ...props }: Group & { size?: number; opacity?: number }) {
  const { geo, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size, size, 12, 12);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (size / 2);
      const z = pos.getZ(i) / (size / 2);
      pos.setY(i, 0.004 * Math.max(0, Math.abs(x * z) - 0.5));
    }
    geo.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: "#EFE6D3", roughness: 0.75, side: THREE.DoubleSide, transparent: true });
    return { geo, material };
  }, [size]);
  material.opacity = opacity;
  if (opacity <= 0) return null;
  return (
    <group {...props}>
      <mesh geometry={geo} material={material} castShadow receiveShadow />
    </group>
  );
}

/** The serving bowl at a smaller scale: about 11 cm across at 0.42. */
export function SmallBowl({ scale, ...props }: Group & { scale: number }) {
  return (
    <group {...props} scale={scale}>
      <Bowl spec={spec.bowl} />
    </group>
  );
}

/** Heights inside a small bowl of the given scale: the inside floor, and the inside radius
 * at a height above it. */
export function smallBowlInside(scale: number) {
  const inner = spec.bowl.profile.slice(0, spec.bowl.profile.findIndex(([r]) => r >= spec.bowl.rim));
  const floor = inner[0][1] * scale;
  const radiusAt = (y: number) => {
    for (let i = 1; i < inner.length; i++) {
      const [r0, y0] = inner[i - 1];
      const [r1, y1] = inner[i];
      if (y / scale <= y1) return scale * (r0 + ((r1 - r0) * (y / scale - y0)) / Math.max(y1 - y0, 1e-6));
    }
    return scale * inner[inner.length - 1][0];
  };
  return { floor, radiusAt };
}
