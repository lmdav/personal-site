// The four templates around the finished bowl (docs/adr/0004-recipe-video-scene-files.md):
// the hero shot with the title, the pull-apart with labels drawing in on their times, the
// build (the baked physics drop, the cold half at step "cold" and the hot half at "hot"),
// and the finish (the sauce drizzle at "drizzle", a side dish, and the end card at
// "card"). Cameras meet where scenes join, so hero to pull-apart and build to finish cut
// without a seam. The bowl is the one in the build file bowlShot.tsx reads.
import { useMemo } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Bowl } from "../three/Bowl";
import { BowlFood, LAYERS, Labels, Sauce, build, clamp, droppedPose, items, liftedPose, mix, orbit, samples } from "../three/bowlShot";
import { SmallBowl, smallBowlInside } from "../three/cookware";
import { beanPile } from "../three/cooking";
import { KitProvider } from "../three/ingredients";
import { Studio } from "../three/Studio";
import { TitleBlock } from "./overlay";
import type { SceneData } from "./scenes";
import { Shot, Stage, ramp, type SceneProps, type TemplateProps } from "./stage";

const CLOSE = 0.68;
const CLOSE_TALL = 0.84; // the vertical cut is narrow, so it stands back a little
const TITLE_ROOM = 1.5; // how far the bowl slides right to make room for the title
// Camera angles where scenes meet.
const AZ = { heroIn: -0.62, heroOut: -0.45, apartOut: -0.1, buildIn: 0.0, buildOut: 0.22, finishOut: 0.4 };
const rested = (i: number) => liftedPose(i, 0);

function BowlSet({ children, frame, poseOf, idle, tall }: { children?: React.ReactNode; frame: number; poseOf: Parameters<typeof BowlFood>[0]["poseOf"]; idle?: number; tall: boolean }) {
  return (
    <>
      {/* The vertical cut leaves out the board and onion, which crowd its title. */}
      <Studio props={!tall} />
      <Bowl spec={build.bowl} />
      <KitProvider>
        <BowlFood poseOf={poseOf} idle={idle} frame={frame} />
        {children}
      </KitProvider>
    </>
  );
}

function Hero({ s }: { s: SceneProps }) {
  const f = useCurrentFrame();
  const { position, target } = orbit(mix(AZ.heroIn, AZ.heroOut, f / s.len), 0, TITLE_ROOM, s.tall ? CLOSE_TALL : CLOSE, s.tall);
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <BowlSet tall={s.tall} frame={f} poseOf={rested}>
        <Sauce lift={0} opacity={1} drawn={1} />
      </BowlSet>
    </Stage>
  );
}

export function HeroScene({ s, file }: TemplateProps) {
  const f = useCurrentFrame();
  return (
    <>
      <Hero s={s} />
      <TitleBlock show={ramp(f, 8, 22, Easing.out(Easing.cubic))} title={file.title} facts={file.facts} />
    </>
  );
}

function Apart({ s, labelAt }: { s: SceneProps; labelAt: number[] }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The sauce lifts first, then the layers from the top down, as the camera pulls back.
  const liftOf = (rank: number) => spring({ frame: f - (16 + rank * 6), fps, config: { damping: 20, stiffness: 45, mass: 1.2 } });
  const apart = interpolate(f, [8, 70], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const titleRoom = TITLE_ROOM * (1 - ramp(f, 0, 40));
  const { position, target } = orbit(mix(AZ.heroOut, AZ.apartOut, f / s.len), apart, titleRoom, s.tall ? CLOSE_TALL : CLOSE, s.tall);
  // Labels draw in on their times, a layer at a time from the bottom, then the sauce.
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <BowlSet tall={s.tall} frame={f} poseOf={(i) => liftedPose(i, liftOf(LAYERS - items[i].layer))} idle={ramp(f, 70, 30)}>
        <Sauce lift={liftOf(0)} opacity={1} drawn={1} />
      </BowlSet>
      <Labels showOf={(li) => ramp(f, labelAt[li] - 2, 18, Easing.out(Easing.cubic))} />
    </Stage>
  );
}

export function PullApartScene({ s, p, file }: TemplateProps) {
  const f = useCurrentFrame();
  const { labels } = p.scene as Extract<SceneData, { template: "pullApart" }>;
  return (
    <>
      <Apart s={s} labelAt={labels.map(p.frame)} />
      <TitleBlock show={1 - ramp(f, 0, 16)} title={file.title} facts={file.facts} />
    </>
  );
}

// The cold half (romaine, then tomato, onion, and pickles) drops at "cold"; the hot half
// waits for "hot". The bake releases the first hot layer at this sample. scenes.ts
// (minFrames) gives the scene room for every piece to settle.
const HOT_FIRST = Math.min(...items.filter((it) => it.layer >= 2).map((it) => it.release));
const LAST = samples.length - 1;

export function BuildScene({ s, p }: TemplateProps) {
  const f = useCurrentFrame();
  const coldAt = p.at.cold;
  const hotAt = p.at.hot;
  const poseOf = (i: number) => (items[i].layer < 2 ? droppedPose(i, f - coldAt) : droppedPose(i, f - hotAt + HOT_FIRST));
  const apart = 1 - interpolate(f, [coldAt + 2, hotAt + 100], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const { position, target } = orbit(mix(AZ.buildIn, AZ.buildOut, f / s.len), apart, 0, s.tall ? CLOSE_TALL : CLOSE, s.tall, s.tall ? 0.02 : 0.09);
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <BowlSet tall={s.tall} frame={f} poseOf={poseOf} />
    </Stage>
  );
}

/** Smoky beans in a small bowl, set beside the big one. */
function Beans({ x, z }: { x: number; z: number }) {
  const scale = 0.5;
  const { radiusAt, pile } = useMemo(() => {
    const inside = smallBowlInside(scale);
    return { radiusAt: inside.radiusAt, pile: beanPile(inside.floor, inside.radiusAt) };
  }, []);
  return (
    <group position={[x, 0, z]}>
      <SmallBowl scale={scale} />
      <mesh position-y={pile.sauceY} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[radiusAt(pile.sauceY) - 0.001, 48]} />
        <meshPhysicalMaterial color="#6B2E17" roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {pile.spots.map((b, i) => (
        <mesh key={i} geometry={pile.bean} position={b.p} rotation={[b.tilt, b.yaw, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color={i % 3 ? "#8A4527" : "#9C5A35"} roughness={0.28} clearcoat={1} clearcoatRoughness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function Finish({ s, at, sideAt }: { s: SceneProps; at: Record<string, number>; sideAt?: number }) {
  const f = useCurrentFrame();
  const card = ramp(f, at.card, 45);
  const { position, target } = orbit(mix(AZ.buildOut, AZ.finishOut, f / s.len), 0, TITLE_ROOM * card, s.tall ? mix(CLOSE_TALL, 0.98, card) : mix(CLOSE, 0.92, card), s.tall);
  const beansIn = sideAt === undefined ? 0 : ramp(f, sideAt, 34, Easing.out(Easing.cubic));
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={s.draft} />
      <BowlSet tall={s.tall} frame={f} poseOf={(i) => droppedPose(i, LAST)}>
        <Sauce lift={0} opacity={1} drawn={interpolate(f, [at.drizzle, at.drizzle + 42], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) })} />
      </BowlSet>
      {beansIn > 0 && <Beans x={mix(0.55, s.tall ? 0.06 : 0.135, beansIn)} z={s.tall ? -0.22 : -0.17} />}
    </Stage>
  );
}

/** The finished bowl on its own, centered, with no title or caption: the video's poster
 * frame on the recipe page. The same shot the build scene ends on. */
export function PosterShot() {
  const s: SceneProps = { len: 1, beats: [0], draft: false, tall: false };
  const { position, target } = orbit(AZ.buildOut, 0, 0, CLOSE);
  return (
    <Stage s={s}>
      <Shot position={position} target={target} draft={false} />
      <BowlSet tall={false} frame={0} poseOf={(i) => droppedPose(i, LAST)} />
    </Stage>
  );
}

export function FinishScene({ s, p, file }: TemplateProps) {
  const f = useCurrentFrame();
  const { side } = p.scene as Extract<SceneData, { template: "finish" }>;
  return (
    <>
      <Finish s={s} at={p.at} sideAt={side && p.frame(side.at)} />
      <TitleBlock show={ramp(f, p.at.card + 20, 24, Easing.out(Easing.cubic))} title={file.title} facts={[...file.facts, file.endCard]} />
    </>
  );
}
