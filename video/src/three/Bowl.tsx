// A wide stoneware bowl turned on a lathe from the build spec's profile, in a speckled
// cream glaze that darkens where it thins over the rim, with an unglazed foot ring. The
// physics bake collides with exactly this shape (tools/bake-drop.mjs).
import { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../geo";

type BowlSpec = { profile: number[][]; segments: number; rim: number };

/** The glaze, painted along the profile: v runs from the inside middle to the foot. */
function glazeTexture(profile: number[][], rim: number) {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rimIndex = profile.findIndex(([r]) => r >= rim);
  const footIndex = profile.findIndex(([r, y], i) => i > rimIndex && y < 0.0065);
  const vOf = (i: number) => i / (profile.length - 1);
  // canvas row 0 is v = 1 (the foot), the bottom row is v = 0 (the inside middle)
  const rowOf = (v: number) => (1 - v) * H;
  const grad = g.createLinearGradient(0, rowOf(0), 0, rowOf(1));
  grad.addColorStop(0, "#F1EADD");
  grad.addColorStop(vOf(rimIndex - 3), "#EEE5D5");
  grad.addColorStop(vOf(rimIndex - 1), "#D9C4A4");
  grad.addColorStop(vOf(rimIndex), "#B48D63");
  grad.addColorStop(vOf(rimIndex + 1), "#D7C19F");
  grad.addColorStop(vOf(rimIndex + 3), "#EAE0CE");
  grad.addColorStop(vOf(footIndex - 1), "#E6DBC8");
  grad.addColorStop(vOf(footIndex), "#C9B293");
  grad.addColorStop(1, "#BFA584");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // iron speckles in the glaze
  const r = rng(61);
  for (let i = 0; i < 2600; i++) {
    const s = 0.6 + r() * 1.6;
    g.fillStyle = `rgba(${90 + r() * 40}, ${60 + r() * 25}, ${40 + r() * 15}, ${0.35 + r() * 0.45})`;
    g.beginPath();
    g.ellipse(r() * W, r() * H, s * 1.4, s, 0, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function Bowl({ spec }: { spec: BowlSpec }) {
  const { geo, material } = useMemo(() => {
    const geo = new THREE.LatheGeometry(
      spec.profile.map(([r, y]) => new THREE.Vector2(r, y)),
      spec.segments,
    );
    geo.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({
      map: glazeTexture(spec.profile, spec.rim),
      roughness: 0.32,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
    });
    return { geo, material };
  }, [spec]);
  return <mesh geometry={geo} material={material} castShadow receiveShadow />;
}
