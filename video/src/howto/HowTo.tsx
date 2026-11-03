// The narrated how-to video in the v4 product-shot style (docs/recipes-media-v4.md). Each
// scene lasts as long as its narration (timed by narrate.py) plus a little air, and never
// less than its action needs. Captions follow the narration beat by beat, and actions are
// timed to the beat that names them.
import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import narration from "../data/smash-burger-bowl.narration.json";
import script from "../recipes/smash-burger-bowl.narration.json";
import { BACKDROP } from "../three/Studio";
import { ApartScene, BuildScene, FinishScene, HeroScene, buildMinFrames } from "./bowlScenes";
import { Captions, Fade } from "./overlay";
import { MushroomScene, PattyScene, mushroomCues, pattyCues, pattyMinFrames } from "./panScenes";
import { PotatoScene, potatoCues, potatoMinFrames } from "./PotatoScene";
import { SauceScene, sauceCues, sauceMinFrames } from "./SauceScene";
import { Cues, MusicBed, type Cue } from "./sound";
import type { SceneProps } from "./stage";

const SLUG = "smash-burger-bowl";
const FPS = 30;
const LEAD = 12; // frames before the narration starts
const TAIL = 30; // frames after it ends, a hold to take each step in

type SceneDef = {
  id: keyof typeof script;
  View: ComponentType<{ s: SceneProps }>;
  /** The fewest frames the scene's action needs, given its beats. */
  min?: (beats: number[]) => number;
  /** Cooking sounds, in scene frames. */
  cues?: (beats: number[], len: number) => Cue[];
  fadeIn: boolean;
  fadeOut: boolean;
};

const SCENES: SceneDef[] = [
  { id: "hero", View: HeroScene, fadeIn: true, fadeOut: false },
  { id: "apart", View: ApartScene, fadeIn: false, fadeOut: true },
  { id: "potatoes", View: PotatoScene, min: potatoMinFrames, cues: potatoCues, fadeIn: true, fadeOut: true },
  { id: "sauce", View: SauceScene, min: sauceMinFrames, cues: sauceCues, fadeIn: true, fadeOut: true },
  { id: "mushrooms", View: MushroomScene, cues: mushroomCues, fadeIn: true, fadeOut: true },
  { id: "patties", View: PattyScene, min: pattyMinFrames, cues: pattyCues, fadeIn: true, fadeOut: true },
  { id: "build", View: BuildScene, min: buildMinFrames, fadeIn: true, fadeOut: false },
  { id: "finish", View: FinishScene, fadeIn: false, fadeOut: true },
];

const durations = narration.durations as Record<string, number>;
const starts = narration.beats as Record<string, number[]>;

/** Where every scene sits in the video, in frames. */
export const PLAN = (() => {
  let at = 0;
  return SCENES.map((scene) => {
    const beats = starts[scene.id].map((t) => LEAD + Math.round(t * FPS));
    const len = Math.max(LEAD + Math.round(durations[scene.id] * FPS) + TAIL, scene.min?.(beats) ?? 0);
    const from = at;
    at += len;
    const voice: [number, number] = [from + LEAD, from + LEAD + Math.round(durations[scene.id] * FPS)];
    return { ...scene, from, len, beats, voice, captions: script[scene.id].map((b) => b.caption) };
  });
})();

export const HOWTO_FRAMES = PLAN.reduce((sum, s) => sum + s.len, 0);

/** draft: half resolution and no lens effects, for quick previews. tall: the vertical
 * 9:16 cut, framed and laid out for a phone. sound: false leaves out the music and
 * cooking sounds (the narration stays). */
export function HowTo({ draft = false, tall = false, sound = true }: { draft?: boolean; tall?: boolean; sound?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: BACKDROP }}>
      {sound && <MusicBed total={HOWTO_FRAMES} voice={PLAN.map((s) => s.voice)} />}
      {PLAN.map(({ id, View, from, len, beats, captions, fadeIn, fadeOut, cues }) => (
        <Sequence key={id} from={from} durationInFrames={len} name={id}>
          <View s={{ len, beats, draft, tall }} />
          {sound && cues && <Cues cues={cues(beats, len)} />}
          <Captions lines={captions} beats={beats} len={len} />
          <Fade len={len} fadeIn={fadeIn} fadeOut={fadeOut} />
          <Sequence from={LEAD}>
            <Audio src={staticFile(`${SLUG}/narration/${id}.wav`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
