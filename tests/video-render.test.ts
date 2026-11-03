import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { BOWL_SLUG } from "../video/src/howto/scenes.ts";
import { judge, parseSummary } from "../video/tools/loudness.mjs";
import { watchProgress } from "../video/tools/watchdog.mjs";

// The pieces of the one-command render (video/render.mjs) that can be tested without
// rendering: the stall watchdog and the loudness verdicts.

/** A fake clock and interval: tick(ms) moves time forward and fires the interval. */
function fakeTimers() {
  let t = 0;
  let fn: (() => void) | null = null;
  return {
    now: () => t,
    timers: { setInterval: (f: () => void) => ((fn = f), 1), clearInterval: () => (fn = null) },
    tick(ms: number) {
      for (let i = 0; i < ms / 1000; i++) {
        t += 1000;
        fn?.();
      }
    },
  };
}

test("the watchdog calls a stall once after the limit with no progress", () => {
  const clock = fakeTimers();
  const stalls: number[] = [];
  const watch = watchProgress({ limitMs: 120_000, every: 1000, onStall: (ms) => stalls.push(ms), ...clock });
  for (let i = 0; i < 10; i++) {
    watch.progress(`frames ${i}`);
    clock.tick(60_000); // a minute between updates: slow, but moving
  }
  assert.deepEqual(stalls, []);
  watch.progress("frames 9"); // the same report again is not progress
  clock.tick(60_000);
  assert.deepEqual(stalls, [120_000]);
  assert.equal(watch.stalled, true);
  clock.tick(300_000);
  assert.equal(stalls.length, 1);
  watch.stop();
});

test("the watchdog stops watching when stopped", () => {
  const clock = fakeTimers();
  const stalls: number[] = [];
  const watch = watchProgress({ limitMs: 1000, every: 1000, onStall: (ms) => stalls.push(ms), ...clock });
  watch.stop();
  clock.tick(10_000);
  assert.deepEqual(stalls, []);
});

const QUIET = { integrated: -22.8, peak: -3.5 };
const scene = (id: string, mix: number, voice = -22.4) => ({ id, mix, voice });

test("the approved mix passes the loudness check", () => {
  const { failures, lines } = judge(QUIET, [scene("hero", -22.7, -22.7), scene("apart", -22.5), scene("mushrooms", -22.5, -22.6)]);
  assert.deepEqual(failures, []);
  assert.equal(lines.length, 3);
});

test("the loudness check catches a loud bed, a missing voice, clipping, and a quiet mix", () => {
  const { failures } = judge({ integrated: -27.5, peak: -0.4 }, [scene("sauce", -21.6), scene("patties", -40), scene("build", -Infinity), scene("finish", -30, -Infinity)]);
  assert.equal(failures.length, 6, failures.join("\n"));
  assert.match(failures[0], /-27.5 LUFS, outside -25 to -20/);
  assert.match(failures[1], /true peak is -0.4/);
  assert.match(failures[2], /sauce: .*0\.8 LU over the narration/);
  assert.match(failures[3], /patties: .*17\.6 LU quieter/);
  assert.match(failures[4], /build: the mix is silent under the narration/);
  assert.match(failures[5], /finish: the narration clip is silent/);
});

test("the loudness meter's summary is read, including a silent peak", () => {
  const text = "...t: 113.5 M: -30.1\n[Parsed_ebur128_0] Summary:\n\n  Integrated loudness:\n    I:         -22.8 LUFS\n    Threshold: -33.4 LUFS\n\n  True peak:\n    Peak:       -inf dBFS\n";
  assert.deepEqual(parseSummary(text), { integrated: -22.8, peak: -Infinity });
  assert.throws(() => parseSummary("no audio"), /no summary/);
});

test("the bowl's slug matches the build file and bake bowlShot.tsx draws", () => {
  const source = readFileSync(path.join(process.cwd(), "video", "src", "three", "bowlShot.tsx"), "utf8");
  assert.match(source, new RegExp(`from "\\.\\./data/${BOWL_SLUG}\\.drop\\.json"`));
  assert.match(source, new RegExp(`from "\\.\\./recipes/${BOWL_SLUG}\\.build\\.json"`));
});
