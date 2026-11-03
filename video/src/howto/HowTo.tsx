// The narrated how-to video in the v4 product-shot style (docs/recipes-media-v4.md), laid
// out from the recipe's scene file (docs/adr/0004-recipe-video-scene-files.md). Each scene
// lasts as long as its narration (timed by narrate.py) plus a little air, and never less
// than its action needs. Captions follow the narration beat by beat, and actions are
// timed to the beats and steps that name them.
import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BACKDROP } from "../three/Studio";
import { BuildScene, FinishScene, HeroScene, PullApartScene } from "./bowlScenes";
import { MixScene } from "./MixScene";
import { Captions, Chip, Fade } from "./overlay";
import { PrepScene } from "./PrepScene";
import { recipeOf } from "./recipes";
import { LEAD, type Planned, type Template } from "./scenes";
import { SkilletScene } from "./skilletScenes";
import { Cues, MusicBed } from "./sound";
import { ramp, type TemplateProps } from "./stage";

const VIEWS: Record<Template, ComponentType<TemplateProps>> = {
  hero: HeroScene,
  pullApart: PullApartScene,
  prep: PrepScene,
  mix: MixScene,
  skillet: SkilletScene,
  build: BuildScene,
  finish: FinishScene,
};

/** A scene's timer chips: each shows over its window, and its ring fills over its timer. */
function Chips({ chips }: { chips: Planned["chips"] }) {
  const f = useCurrentFrame();
  return (
    <>
      {chips.map(({ text, show, timer }, i) => (
        <Chip
          key={i}
          text={text}
          show={interpolate(f, [show[0], show[0] + 8, show[1] - 8, show[1]], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
          progress={timer && ramp(f, timer[0], timer[1] - timer[0], Easing.linear)}
        />
      ))}
    </>
  );
}

/** slug: the recipe. draft: half resolution and no lens effects, for quick previews.
 * tall: the vertical 9:16 cut, framed and laid out for a phone. sound: false leaves out
 * the music and cooking sounds (the narration stays). */
export function HowTo({ slug, draft = false, tall = false, sound = true }: { slug: string; draft?: boolean; tall?: boolean; sound?: boolean }) {
  const { file, plan, frames } = recipeOf(slug);
  return (
    <AbsoluteFill style={{ backgroundColor: BACKDROP }}>
      {sound && <MusicBed total={frames} voice={plan.map((s) => s.voice)} />}
      {plan.map((p) => {
        const { id, template, fade } = p.scene;
        const View = VIEWS[template];
        return (
          <Sequence key={id} from={p.from} durationInFrames={p.len} name={id}>
            <View s={{ len: p.len, beats: p.beats, draft, tall }} p={p} file={file} />
            <Chips chips={p.chips} />
            {sound && <Cues cues={p.cues} />}
            <Captions lines={p.captions} beats={p.beats} len={p.len} />
            <Fade len={p.len} fadeIn={fade === "in" || fade === "both"} fadeOut={fade === "out" || fade === "both"} />
            <Sequence from={LEAD}>
              <Audio src={staticFile(`${slug}/narration/${id}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
