// The pot template (docs/adr/0004-recipe-video-scene-files.md), for rice: grains pour into a
// pot (step "rice"), water follows ("water"), the lid goes on with a warm glow from the
// burner ("lid"), and the glow fades when the heat goes off ("off"), with steam at the rim.
import { useLayoutEffect, useMemo } from "react";
import { Easing, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { rng } from "../geo";
import { mix } from "../three/bowlShot";
import { Steam } from "../three/cooking";
import { Lid, POT, Pot } from "../three/cookware";
import { KitProvider, useKit } from "../three/ingredients";
import { Studio } from "../three/Studio";
import { Shot, Stage, aim, ramp, type SceneProps, type TemplateProps } from "./stage";

const GRAINS = 1900;
const POUR = 34; // frames the rice takes to pour in
const WATER = { depth: 0.024, rise: 28 };

function Rice({ at }: { at: Record<string, number> }) {
  const f = useCurrentFrame();
  const { grain } = useKit().foods();
  const { mesh, spots } = useMemo(() => {
    const r = rng(83);
    const mesh = new THREE.InstancedMesh(grain.geo, new THREE.MeshPhysicalMaterial({ roughness: 0.42, clearcoat: 0.3 }), GRAINS);
    const spots = Array.from({ length: GRAINS }, (_, i) => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (POT.radius - 0.008);
      mesh.setColorAt(i, grain.shades[i % grain.shades.length]);
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, y: POT.floor + 0.005 + r() * 0.007, turn: r() * 6.3, tilt: r() * 0.6, start: (i / GRAINS) * POUR, sx: (r() - 0.5) * 0.012, sz: (r() - 0.5) * 0.012 };
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return { mesh, spots };
  }, [grain]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    spots.forEach((q, i) => {
      const t = Math.min(1, Math.max(0, (f - at.rice - q.start) / 10));
      o.position.set(mix(q.sx, q.x, t), mix(0.3, q.y, t * t), mix(q.sz, q.z, t));
      o.rotation.set(q.tilt, q.turn + (1 - t) * 3, 0);
      o.scale.setScalar(f >= at.rice + q.start ? 1 : 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [mesh, spots, f, at]);
  return <primitive object={mesh} />;
}

function Set({ at }: { at: Record<string, number> }) {
  const f = useCurrentFrame();
  const fill = ramp(f, at.water + 4, WATER.rise, Easing.out(Easing.quad));
  const stream = f >= at.water && f < at.water + WATER.rise;
  const lid = ramp(f, at.lid, 16, Easing.inOut(Easing.cubic));
  const heat = ramp(f, at.lid, 20) * (1 - ramp(f, at.off, 16));
  const y = POT.floor + 0.002 + WATER.depth * fill;
  return (
    <>
      <Pot />
      <Rice at={at} />
      {/* The grains underneath, so the pile reads solid once enough have landed. */}
      <mesh position-y={POT.floor + 0.0035} rotation-x={-Math.PI / 2} scale={Math.max(0.001, ramp(f, at.rice + 6, POUR, Easing.out(Easing.quad)))} receiveShadow>
        <circleGeometry args={[POT.radius - 0.006, 48]} />
        <meshStandardMaterial color="#E9E2CF" roughness={0.7} />
      </mesh>
      {fill > 0 && (
        <mesh position-y={y} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[POT.radius - 0.0008, 64]} />
          <meshPhysicalMaterial color="#C5D4D6" roughness={0.08} clearcoat={1} clearcoatRoughness={0.05} transparent opacity={0.42} depthWrite={false} />
        </mesh>
      )}
      {stream && (
        <mesh position={[0.03, y + (0.3 - y) / 2, 0.01]}>
          <cylinderGeometry args={[0.0034, 0.0044, 0.3 - y, 14]} />
          <meshPhysicalMaterial color="#D9E4E6" roughness={0.06} clearcoat={1} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      )}
      {lid > 0 && <Lid radius={0.083} position-y={POT.rim + 0.32 * (1 - lid)} />}
      {heat > 0 && <pointLight position={[0, 0.005, 0.12]} color="#FF8A42" intensity={0.05 * heat} distance={0.5} decay={2} />}
      <Steam from={[[0.07, POT.rim + 0.012, 0.03], [-0.07, POT.rim + 0.012, -0.02], [0.0, POT.rim + 0.012, 0.08]]} frame={f} amount={ramp(f, at.lid + 24, 40) * 0.8} spread={0.02} rise={0.14} />
    </>
  );
}

function Shots({ s, at }: { s: SceneProps; at: Record<string, number> }) {
  const f = useCurrentFrame();
  const t = f / s.len;
  // Looking into the pot while the rice and water go in, then back as the lid comes down.
  const back = ramp(f, at.lid - 6, 34);
  const { position, target } = aim([0, mix(0.03, 0.06, back), 0], mix(-0.22, 0.12, t), mix(1.02, 0.72, back), mix(0.5, 0.62, back) + (s.tall ? 0.06 : 0));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <Studio props={false} />
      <KitProvider>
        <Set at={at} />
      </KitProvider>
    </Stage>
  );
}

export function PotScene({ s, p }: TemplateProps) {
  return <Shots s={s} at={p.at} />;
}
