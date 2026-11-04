// v4 product shot, in real 3D: the finished bowl pulls apart into floating, labeled
// layers, then the layers drop back in under baked Rapier physics (played in 2x slow
// motion), and the sauce drizzles on last. Everything comes from the recipe's build spec
// (src/recipes/<slug>.build.json) and its physics bake (tools/bake-drop.mjs).
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bowl } from "../three/Bowl";
import { BowlFood, CameraRig, Labels, Sauce, bowlOf, clamp, orbit } from "../three/bowlShot";
import { KitProvider } from "../three/ingredients";
import { BACKDROP, Lens, Studio, dprFor } from "../three/Studio";
import { MONO, SERIF } from "../theme";

export const BOWL_REAL_FRAMES = 450;
// Key moments, in video frames.
const T = { lift: 50, labelsIn: 112, labelsOut: 198, drop: 212, sauce: 352, title: 392 };

/** Where the camera is and what it looks at, from 0 (the finished bowl) to 1 (pulled apart). */
function cameraAt(frame: number, apart: number) {
  const azimuth = -0.3 + (frame / BOWL_REAL_FRAMES) * 0.45;
  const titleRoom = interpolate(frame, [T.sauce + 10, T.title + 20], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return orbit(azimuth, apart, titleRoom, 0.7 - 0.04 * (frame / BOWL_REAL_FRAMES));
}

function Scene({ lens }: { lens: boolean }) {
  const bowl = bowlOf("smash-burger-bowl");
  const { LAYERS, build, items, droppedPose, liftedPose } = bowl;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // How far each layer is pulled apart (0 in the bowl, 1 floating). The sauce goes first,
  // then the layers from the top down.
  const liftOf = (rank: number) => spring({ frame: frame - (T.lift + rank * 6), fps, config: { damping: 20, stiffness: 45, mass: 1.2 } });
  const apart = interpolate(frame, [24, 84, 215, 330], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const idle = interpolate(frame, [96, 126, 186, T.drop], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const { position, target } = cameraAt(frame, apart);

  const poseOf = (i: number) => (frame >= T.drop ? droppedPose(i, frame - T.drop) : liftedPose(i, liftOf(LAYERS - items[i].layer)));

  const labelShow = (rank: number) => interpolate(frame, [T.labelsIn + rank * 4, T.labelsIn + 18 + rank * 4, T.labelsOut, T.labelsOut + 12], [0, 1, 1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sauceLift = frame >= T.sauce ? 0 : liftOf(0) + interpolate(frame, [T.drop, T.drop + 10], [0, 0.4], clamp);
  const sauceOpacity = frame >= T.sauce ? 1 : interpolate(frame, [T.drop, T.drop + 8], [1, 0], clamp);
  const sauceDrawn = frame >= T.sauce ? interpolate(frame, [T.sauce, T.sauce + 38], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) }) : 1;

  return (
    <>
      <Studio />
      <Bowl spec={build.bowl} />
      <CameraRig position={position} target={target} />
      <KitProvider>
        <BowlFood bowl={bowl} poseOf={poseOf} idle={idle} frame={frame} />
        <Sauce bowl={bowl} lift={sauceLift} opacity={sauceOpacity} drawn={sauceDrawn} />
      </KitProvider>
      <Labels bowl={bowl} showOf={(li) => labelShow(li === LAYERS ? 0 : LAYERS - li)} />
      {lens && <Lens focus={[target.x, target.y, target.z]} />}
    </>
  );
}

function Title() {
  const frame = useCurrentFrame();
  const show = interpolate(frame, [T.title, T.title + 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: "absolute", left: 130, top: 430, opacity: show, transform: `translateY(${(1 - show) * 16}px)` }}>
      <div style={{ fontFamily: SERIF, fontSize: 88, color: "#2B231B", lineHeight: 1 }}>Smash Burger Bowl</div>
      <div style={{ fontFamily: MONO, fontSize: 22, color: "#6E5E4C", letterSpacing: 2, marginTop: 18, lineHeight: 1.7 }}>
        57 G PROTEIN · 30 MIN
        <br />
        LMDAV.COM/RECIPES
      </div>
    </div>
  );
}

/** lens: false skips the lens effects. draft: true draws at half resolution with no lens
 * effects, for quick previews. */
export function BowlReal({ lens = true, draft = false }: { lens?: boolean; draft?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: BACKDROP }}>
      <ThreeCanvas width={1920} height={1080} dpr={dprFor(draft)} shadows camera={{ fov: 28, near: 0.01, far: 20, position: [0, 0.5, 0.8] }} gl={{ antialias: false, preserveDrawingBuffer: true }}>
        <Scene lens={lens && !draft} />
      </ThreeCanvas>
      <Title />
    </AbsoluteFill>
  );
}
