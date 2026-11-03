// Food as it cooks, for the how-to scenes: a shader that takes any material from raw to
// done, the raw shapes (a whole potato, a ball of ground beef, a dollop), a slice of cheese
// that melts, smoky beans in a small bowl, and wisps of steam.
import { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../geo";
import { beefTexture, potatoSkinTexture } from "./paint";

/** A copy of material that can be shown raw. At done 0 it takes the raw color, keeping
 * `keep` (0 to 1) of the surface's own light and dark so its texture still reads; at done
 * 1 it is the material as it was. */
export function cookable<M extends THREE.MeshStandardMaterial>(material: M, raw: THREE.ColorRepresentation, keep = 0.4) {
  const m = material.clone() as M;
  const uniforms = { uDone: { value: 1 }, uRaw: { value: new THREE.Color(raw) }, uKeep: { value: keep } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = `uniform float uDone;\nuniform vec3 uRaw;\nuniform float uKeep;\n${shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float cookLum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 rawShade = uRaw * mix(1.0, 0.55 + 1.2 * cookLum, uKeep);
      diffuseColor.rgb = mix(rawShade, diffuseColor.rgb, clamp(uDone, 0.0, 1.0));`,
    )}`;
  };
  m.customProgramCacheKey = () => "cookable";
  return {
    material: m,
    /** Sets how done it is, from 0 (raw) to 1. */
    done(d: number) {
      uniforms.uDone.value = d;
      return m;
    },
  };
}

/** A lumpy round shape: a sphere pushed in and out by a few smooth waves. */
function lumpy(radius: [number, number, number], seed: number, bumps: number, detail = 5) {
  const r = rng(seed);
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const ph = Array.from({ length: 6 }, () => r() * 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + 0.06 * Math.sin(x * 2.3 + ph[0]) * Math.cos(z * 2.1 + ph[1]) + 0.04 * Math.sin(y * 3.1 + ph[2]) + bumps * Math.sin(x * 23 + ph[3]) * Math.sin(y * 21 + ph[4]) * Math.sin(z * 25 + ph[5]);
    pos.setXYZ(i, x * k * radius[0], y * k * radius[1], z * k * radius[2]);
  }
  geo.computeVertexNormals();
  return geo;
}

/** The raw shapes, built once and shared. */
export function useRawFood() {
  return useMemo(() => {
    const skin = potatoSkinTexture();
    const beef = beefTexture();
    beef.wrapS = beef.wrapT = THREE.RepeatWrapping;
    beef.repeat.set(2, 2);
    return {
      /** Whole baby potatoes, about 5.5 cm long, centered. */
      potatoes: [0, 1, 2].map((i) => lumpy([0.03 + 0.003 * i, 0.023, 0.025 + 0.002 * i], 70 + i, 0.012)),
      potatoSkin: new THREE.MeshPhysicalMaterial({ map: skin, bumpMap: skin, bumpScale: 1.4, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.4 }),
      /** A loose 3 oz ball of ground beef, about 5.5 cm across, centered. */
      beefBall: lumpy([0.027, 0.025, 0.027], 80, 0.035, 6),
      beef: new THREE.MeshPhysicalMaterial({ map: beef, bumpMap: beef, bumpScale: 2, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 }),
    };
  }, []);
}

/** A soft mound, like a spoonful of yogurt, with its base at the origin. */
export function moundGeometry(radius: number, height: number, tip = 0.15) {
  const n = 24;
  const pts = Array.from({ length: n + 1 }, (_, k) => {
    const t = k / n; // 0 at the base edge, 1 at the top
    const r = radius * Math.cos((t * Math.PI) / 2) ** 0.8;
    const y = height * (Math.sin((t * Math.PI) / 2) + tip * t ** 6);
    return new THREE.Vector2(Math.max(r, 0.0002), y);
  });
  pts.unshift(new THREE.Vector2(0.0002, 0));
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.computeVertexNormals();
  return geo;
}

/** A slice of American cheese, flat or melted so its corners slump over the edge of a
 * patty of the given radius. */
export function cheeseShape(size: number, radius: number, turn: number, melted = true) {
  const geo = new THREE.PlaneGeometry(size, size, 40, 40);
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(turn);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const over = d - radius * 0.9;
    let y = 0.0003 * Math.sin(x * 300) * Math.cos(z * 260);
    if (melted && over > 0) {
      y -= Math.min(0.006, over * 0.7 + over * over * 40);
      const pull = Math.min(over * 0.4, 0.004);
      pos.setX(i, x - (x / d) * pull);
      pos.setZ(i, z - (z / d) * pull);
    }
    pos.setY(i, melted ? y : y + 0.0004);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A slice that melts as its morph goes from 0 (flat) to 1 (melted). */
export function meltingCheese(size: number, radius: number, turn: number) {
  const geo = cheeseShape(size, radius, turn, false);
  const melted = cheeseShape(size, radius, turn, true);
  geo.morphAttributes.position = [melted.attributes.position];
  geo.morphAttributes.normal = [melted.attributes.normal];
  return geo;
}

/** Smoky pinto beans in sauce, piled into a small bowl: the inside floor height, and the
 * inside radius at a height, come from the bowl. */
export function beanPile(floor: number, radiusAt: (y: number) => number) {
  const r = rng(51);
  const spots: { p: [number, number, number]; yaw: number; tilt: number }[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const y = floor + 0.004 + layer * 0.0058;
    const R = radiusAt(y + 0.003) - 0.0075 - layer * 0.006;
    for (let k = 0; k < 60 && R > 0; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * R;
      const p: [number, number, number] = [Math.cos(a) * d, y + r() * 0.002, Math.sin(a) * d];
      if (spots.every((s) => Math.hypot(s.p[0] - p[0], s.p[2] - p[2]) > 0.0105 || Math.abs(s.p[1] - p[1]) > 0.004)) spots.push({ p, yaw: r() * 6.3, tilt: (r() - 0.5) * 0.6 });
    }
  }
  const bean = new THREE.SphereGeometry(1, 20, 12);
  bean.scale(0.0068, 0.0042, 0.0045);
  return { spots, bean, sauceY: floor + 0.007 };
}

/** A soft round puff, for steam. */
export function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** Wisps of steam rising from a few points. amount (0 to 1) fades them in and out. */
export function Steam({ from, frame, amount, spread = 0.03, rise = 0.12 }: { from: [number, number, number][]; frame: number; amount: number; spread?: number; rise?: number }) {
  const map = useMemo(puffTexture, []);
  if (amount <= 0) return null;
  const puffs = from.flatMap((o, k) =>
    [0, 1, 2].map((j) => {
      const r = rng(k * 13 + j * 7 + 1);
      const period = 70 + r() * 30;
      const t = ((frame + r() * period) % period) / period;
      const drift = Math.sin(t * 4 + r() * 6) * spread * 0.6;
      return {
        key: `${k}-${j}`,
        p: [o[0] + drift + (r() - 0.5) * spread, o[1] + t * rise, o[2] + (r() - 0.5) * spread] as [number, number, number],
        s: 0.05 + t * 0.1,
        o: amount * 0.12 * Math.sin(t * Math.PI),
      };
    }),
  );
  return (
    <>
      {puffs.map((q) => (
        <sprite key={q.key} position={q.p} scale={[q.s, q.s, q.s]}>
          <spriteMaterial map={map} transparent opacity={q.o} depthWrite={false} color="#FFFFFF" />
        </sprite>
      ))}
    </>
  );
}
