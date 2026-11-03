// The music bed and the cooking sounds under the narration (sources and licenses in
// assets.json and CREDITS.md). The music sits low and drops further while the voice
// speaks. Cooking sounds stay quiet and play only where something real would make one:
// meat hitting the pan, potatoes crisping, sauce landing in the bowl, a spoon stirring.
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { FPS, type Cue, type CueSound } from "./scenes";

type Sound = "music" | CueSound;
const src = (s: Sound) => staticFile(`audio/${s}.mp3`);

/** Where each sound's useful part starts in its file, in seconds. The crackle skips to a
 * stretch with no loud pops; the plop file holds several separate plops, which cues pick
 * by their own offsets. */
export const START: Record<Sound, number> = { music: 0, sizzle: 0.3, pan: 0.3, crackle: 4, plop: 0, stir: 2 };

export function Cues({ cues }: { cues: Cue[] }) {
  return (
    <>
      {cues.map((c, i) => {
        const fade = c.fade ?? 6;
        return (
          <Sequence key={i} from={Math.round(c.at)} durationInFrames={Math.max(1, Math.round(c.len))} name={c.sound}>
            <Audio
              src={src(c.sound)}
              trimBefore={Math.round(((c.from ?? 0) + START[c.sound]) * FPS)}
              volume={(f) => c.volume * Math.min(interpolate(f, [0, fade], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [c.len - fade, c.len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
            />
          </Sequence>
        );
      })}
    </>
  );
}

const MUSIC_FRAMES = Math.floor(86.9 * FPS); // the track's length
const CROSS = 90; // frames the track overlaps itself when it repeats
// The track measures -16.3 LUFS and the narration -22.4: about -32 between lines and -40
// under the voice.
const LOUD = 0.16;
const UNDER_VOICE = 0.063;

/** The music bed across the whole video. voice lists the frame ranges where narration
 * plays; the music eases down under them. The track repeats with a crossfade if the
 * video is longer than it. */
export function MusicBed({ total, voice }: { total: number; voice: [number, number][] }) {
  const level = (frame: number) => {
    const ducked = Math.max(0, ...voice.map(([a, b]) => interpolate(frame, [a - 10, a, b, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
    const ends = Math.min(interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" }), interpolate(frame, [total - 60, total - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return (LOUD + (UNDER_VOICE - LOUD) * ducked) * ends;
  };
  const plays: number[] = [];
  for (let at = 0; at < total; at += MUSIC_FRAMES - CROSS) plays.push(at);
  return (
    <>
      {plays.map((at, i) => {
        const len = Math.min(MUSIC_FRAMES, total - at);
        return (
          <Sequence key={at} from={at} durationInFrames={len} name="music">
            <Audio
              src={src("music")}
              volume={(f) => {
                const fadeIn = i === 0 ? 1 : interpolate(f, [0, CROSS], [0, 1], { extrapolateRight: "clamp" });
                const fadeOut = at + MUSIC_FRAMES >= total ? 1 : interpolate(f, [MUSIC_FRAMES - CROSS, MUSIC_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return level(at + f) * fadeIn * fadeOut;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
}
