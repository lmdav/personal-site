// The product-shot studio: real Poly Haven scans (cutting board, onion), a cream plaster
// tabletop, the studio_small_09 HDRI for soft white light and reflections, a warm key
// light from behind for food-photo backlight, and lens effects (ambient occlusion, depth
// of field, a neutral tone curve, and a vignette).
import { Environment, useGLTF, useTexture } from "@react-three/drei";
import { useThree, type ThreeElements } from "@react-three/fiber";
import { DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { staticFile, useDelayRender, useRemotionEnvironment } from "remotion";
import * as THREE from "three";

export const BACKDROP = "#EFE8DC";
const asset = (id: string) => staticFile(`polyhaven/${id}/${id}.gltf`);

/** A Poly Haven model with shadows on, placed in the scene. */
export function Prop({ model: id, ...props }: { model: string } & ThreeElements["group"]) {
  const { scene } = useGLTF(asset(id));
  const copy = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true;
    });
    return clone;
  }, [scene]);
  return (
    <group {...props}>
      <primitive object={copy} />
    </group>
  );
}

function Table() {
  // The plaster's surface (bumps and sheen) with a cream color of our own.
  const [normalMap, roughnessMap] = useTexture(["nor_gl", "rough"].map((m) => staticFile(`polyhaven/beige_wall_001/beige_wall_001_${m}_2k.jpg`)));
  useLayoutEffect(() => {
    for (const t of [normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 3);
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
  }, [normalMap, roughnessMap]);
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[6, 6]} />
      <meshStandardMaterial normalMap={normalMap} normalScale={new THREE.Vector2(0.6, 0.6)} roughnessMap={roughnessMap} color="#E8DDCA" />
    </mesh>
  );
}

/** props: false leaves out the cutting board and onion, for close-up cooking shots. */
export function Studio({ props = true }: { props?: boolean }) {
  return (
    <>
      <color attach="background" args={[BACKDROP]} />
      <fog attach="fog" args={[BACKDROP, 2.2, 5]} />
      <Environment files={staticFile("polyhaven/studio_small_09.hdr")} environmentIntensity={0.9} />
      <directionalLight
        position={[-0.7, 1.1, -0.9]}
        intensity={2.2}
        color="#FFF1E0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.002}
        shadow-camera-left={-0.6}
        shadow-camera-right={0.6}
        shadow-camera-top={0.6}
        shadow-camera-bottom={-0.6}
        shadow-camera-near={0.1}
        shadow-camera-far={4}
      />
      <directionalLight position={[0.9, 0.6, 1.1]} intensity={0.55} color="#FFF3E2" />
      <Table />
      {props && (
        <>
          <Prop model="wooden_cutting_board" position={[-0.46, 0, -0.46]} rotation-y={0.55} />
          <Prop model="yellow_onion" position={[-0.43, 0.041, -0.45]} rotation-y={1.2} />
        </>
      )}
    </>
  );
}

/** The effects composer draws nothing until it has been sized and run once, so when
 * rendering, draw again on the next animation frame and hold the frame until then.
 * Without this, a still, and the first frame of every render batch, comes out blank. */
function WarmUp() {
  const { advance } = useThree();
  const { isRendering } = useRemotionEnvironment();
  const { delayRender, continueRender } = useDelayRender();
  useEffect(() => {
    if (!isRendering) return;
    let held: number | null = delayRender("Warming up the lens effects");
    const release = () => {
      if (held !== null) continueRender(held);
      held = null;
    };
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      release();
    });
    return () => {
      cancelAnimationFrame(id);
      release();
    };
  }, [advance, isRendering, delayRender, continueRender]);
  return null;
}

/** Canvas pixel ratio: drafts draw at half resolution (and skip the lens effects). */
export const dprFor = (draft: boolean) => (draft ? 0.5 : 1);

/** Lens effects. focus is the world point the lens is focused on. The ambient occlusion
 * and depth of field run at half resolution, to keep full renders fast. */
export function Lens({ focus }: { focus: [number, number, number] }) {
  return (
    <>
      <EffectComposer multisampling={2}>
        <N8AO aoRadius={0.05} distanceFalloff={0.6} intensity={2.2} quality="medium" color="#3A2616" />
        <DepthOfField target={focus} worldFocusRange={0.22} bokehScale={2.4} resolutionScale={0.5} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette offset={0.28} darkness={0.42} />
      </EffectComposer>
      <WarmUp />
    </>
  );
}
