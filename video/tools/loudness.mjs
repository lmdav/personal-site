// Checks a rendered video's mix against the levels in docs/recipes-media-v4.md, measured
// from the video's own audio with ffmpeg's EBU R128 meter:
//   - the whole mix's loudness and true peak;
//   - every scene's narration is there, at its own level;
//   - the music and cooking sounds sit well under the voice. With no separate stems, this
//     compares the mix while a scene's narration plays with that narration clip alone: if
//     the bed is 10 dB under the voice, the mix is 0.4 LU louder than the voice alone.
// Limits come from the mix Liam approved on 2026-11-02: -22.8 LUFS, a peak of -3.5 dBFS,
// and every scene's narration window within 0.1 LU of its clip.
import { spawnSync } from "node:child_process";

export const LIMITS = {
  /** The whole mix, in LUFS. The narration alone measures -22.4. */
  loudness: [-25, -20],
  /** True peak, in dBFS. Above this, the web encode can clip. */
  peak: -1,
  /** How much louder the mix may be than the narration alone while it plays, in LU. 0.4
   * means the music and sounds sit at least about 10 dB under the voice. */
  excess: 0.4,
  /** How much quieter it may be: less means the narration is missing or turned down. */
  shortfall: 1,
  /** ffmpeg's meter reports silence as -70 LUFS, never -inf. */
  silence: -69.9,
};

/** Integrated loudness (LUFS) and true peak (dBFS) of a file, or of part of it. */
export function measure(file, part) {
  const cut = part ? ["-ss", part.from.toFixed(3), "-t", part.seconds.toFixed(3)] : [];
  const { stderr, status, error } = spawnSync("ffmpeg", ["-nostats", ...cut, "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 5 * 60 * 1000 });
  if (error || status !== 0) throw new Error(`ffmpeg could not measure ${file}: ${error?.message ?? stderr.slice(-400)}`);
  return parseSummary(stderr);
}

export function parseSummary(text) {
  const at = text.lastIndexOf("Summary:");
  if (at < 0) throw new Error("ffmpeg's loudness meter printed no summary; is there an audio track?");
  const summary = text.slice(at);
  const value = (re) => {
    const m = re.exec(summary);
    if (!m) return undefined;
    return m[1] === "-inf" ? -Infinity : Number(m[1]);
  };
  return { integrated: value(/I:\s*(-?[\d.]+|-inf) LUFS/), peak: value(/Peak:\s*(-?[\d.]+|-inf) dBFS/) };
}

/** Checks the measurements. whole: { integrated, peak } of the mix. scenes: [{ id, mix,
 * voice }], the mix's loudness during each scene's narration and the narration clip's
 * own. Returns one line per scene and a list of failures. */
export function judge(whole, scenes, limits = LIMITS) {
  const failures = [];
  const [low, high] = limits.loudness;
  if (!(whole.integrated >= low && whole.integrated <= high)) failures.push(`the mix measures ${whole.integrated} LUFS, outside ${low} to ${high}`);
  if (!(whole.peak <= limits.peak)) failures.push(`the true peak is ${whole.peak} dBFS, above ${limits.peak}`);
  const lines = scenes.map(({ id, mix, voice }) => {
    const excess = mix - voice;
    const silent = (v) => !(v > limits.silence);
    if (silent(voice)) failures.push(`${id}: the narration clip is silent`);
    else if (silent(mix) || excess < -limits.shortfall) failures.push(`${id}: the mix is ${silent(mix) ? "silent under" : `${(-excess).toFixed(1)} LU quieter than`} the narration; is the voice missing?`);
    else if (excess > limits.excess) failures.push(`${id}: the music and sounds push the mix ${excess.toFixed(1)} LU over the narration alone (at most ${limits.excess}), so they sit less than about 10 dB under the voice`);
    return `${id.padEnd(12)} narration ${voice} LUFS, mix while it plays ${mix} LUFS (${excess >= 0 ? "+" : ""}${excess.toFixed(1)})`;
  });
  return { lines, failures };
}

/** Measures and checks a rendered video. scenes: [{ id, voice: [fromFrame, toFrame],
 * clip: path to the narration WAV }]. */
export function checkLoudness(file, scenes, fps = 30) {
  const whole = measure(file);
  const measured = scenes.map(({ id, voice: [a, b], clip }) => ({ id, mix: measure(file, { from: a / fps, seconds: (b - a) / fps }).integrated, voice: measure(clip).integrated }));
  const { lines, failures } = judge(whole, measured);
  return { lines: [`whole mix    ${whole.integrated} LUFS, true peak ${whole.peak} dBFS`, ...lines], failures };
}
