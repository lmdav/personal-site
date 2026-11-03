import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkSceneFile, fadeRanges, frameOf, planVideo, totalFrames, type SceneFile, type Script } from "../video/src/howto/scenes.ts";

// The video's scene files (docs/adr/0004-recipe-video-scene-files.md): checking them,
// turning their times into frames, and laying out the video.
const RECIPES = path.join(process.cwd(), "video", "src", "recipes");
const read = (name: string) => JSON.parse(readFileSync(path.join(RECIPES, name), "utf8"));
const SLUG = "smash-burger-bowl";
const sceneFile = () => read(`${SLUG}.scenes.json`) as SceneFile;
const script = read(`${SLUG}.narration.json`) as Script;

// narrate.py's timings and the physics bake's numbers for the Smash Burger Bowl as rendered
// on 2026-11-02 (both are generated into the gitignored video/src/data).
const TIMINGS = {
  durations: { hero: 6.208, apart: 12.639, potatoes: 21.597, sauce: 17.247, mushrooms: 9.666, patties: 14.235, build: 8.623, finish: 11.565 },
  beats: {
    hero: [0.0],
    apart: [0.0, 1.943, 5.039, 7.281, 9.053, 10.997],
    potatoes: [0.0, 4.503, 9.604, 13.254, 16.819],
    sauce: [0.0, 2.114, 4.761, 8.113, 12.253, 15.498],
    mushrooms: [0.0, 5.442],
    patties: [0.0, 4.397, 8.111, 11.419],
    build: [0.0, 2.093, 5.871],
    finish: [0.0, 3.97],
  },
};
const BAKE = { last: 149, hotFirst: 20 };

test("times resolve against beats, steps, and the scene's end", () => {
  const beats = [12, 70, 163];
  assert.equal(frameOf(40, beats, {}), 40);
  assert.equal(frameOf("b1", beats, {}), 70);
  assert.equal(frameOf("b2+20", beats, {}), 183);
  assert.equal(frameOf("b2 - 4", beats, {}), 159);
  assert.equal(frameOf("stir-2", beats, { stir: 100 }), 98);
  assert.equal(frameOf("end-6", beats, {}, 300), 294);
  assert.throws(() => frameOf("b3", beats, {}), /beat 3, but the narration has 3 beats/);
  assert.throws(() => frameOf("flip", beats, { stir: 1 }), /"flip".*not a step or moment.*stir/);
  assert.throws(() => frameOf("end", beats, {}), /steps cannot/);
  assert.throws(() => frameOf("b1 + x", beats, {}), /not a time/);
  assert.throws(() => frameOf(2.5, beats, {}), /whole frame/);
});

test("the Smash Burger Bowl's scene file passes its check", () => {
  assert.deepEqual(checkSceneFile(sceneFile(), script, SLUG, SLUG), []);
});

test("the plan matches the hand-written video, scene by scene", () => {
  const plan = planVideo(sceneFile(), script, TIMINGS, BAKE);
  // Lengths and starts of the hand-written version (HowTo.tsx before the scene file).
  assert.deepEqual(
    plan.map((p) => [p.scene.id, p.from, p.len]),
    [
      ["hero", 0, 228],
      ["apart", 228, 421],
      ["potatoes", 649, 690],
      ["sauce", 1339, 563],
      ["mushrooms", 1902, 332],
      ["patties", 2234, 469],
      ["build", 2703, 315],
      ["finish", 3018, 389],
    ],
  );
  assert.equal(totalFrames(plan), 3407);
  const patties = plan.find((p) => p.scene.id === "patties")!;
  const [, add, rest, flip] = patties.beats;
  // The sizzle cues the hand-written scene computed from its patty timings.
  assert.deepEqual(patties.cues, [
    { sound: "sizzle", at: add + 4, len: patties.len - add - 4, volume: 0.13, from: undefined, fade: 8 },
    { sound: "sizzle", at: add + 56, len: 90, volume: 0.09, from: 5, fade: 20 },
    { sound: "sizzle", at: flip + 10, len: 60, volume: 0.07, from: 9, fade: 15 },
  ]);
  assert.deepEqual(patties.chips[1], { text: "HANDS OFF · 2 MIN", show: [rest, flip], timer: [rest, flip - 4] });
  const sauce = plan.find((p) => p.scene.id === "sauce")!;
  assert.deepEqual(sauce.cues[0], { sound: "plop", at: sauce.beats[1] + 8 - 1, len: 8, from: 2.25 - 0.03, volume: 0.25, fade: 2 });
  assert.deepEqual(sauce.cues.at(-1), { sound: "stir", at: sauce.beats[5] + 2, len: 72, volume: 0.75, from: undefined, fade: 10 });
});

test("fade ranges cover each fade in and out, and no cuts", () => {
  const plan = planVideo(sceneFile(), script, TIMINGS, BAKE);
  const ranges = fadeRanges(plan);
  assert.deepEqual(ranges[0], [0, 9]); // the hero fades in
  assert.ok(ranges.some(([a, b]) => a === 649 - 9 && b === 648)); // the pull-apart fades out
  assert.ok(!ranges.some(([a]) => a === 228)); // hero to pull-apart is a cut
  assert.deepEqual(ranges.at(-1), [3407 - 9, 3406]); // the finish fades out
});

test("the check names every problem in a scene file", () => {
  const file = sceneFile();
  const scenes = file.scenes as unknown as Record<string, unknown>[];
  const byId = (id: string) => scenes.find((s) => s.id === id)!;
  byId("hero").template = "parade";
  (byId("potatoes").steps as Record<string, unknown>).crisp = "b9";
  delete (byId("sauce").steps as Record<string, unknown>).stir;
  (byId("mushrooms").sounds as Record<string, unknown>[])[0].sound = "gong";
  (byId("patties").chips as Record<string, unknown>[])[0].show = ["add", "never"];
  (byId("build").steps as Record<string, unknown>).later = "b1";
  scenes.push({ ...byId("finish") });
  const problems = checkSceneFile(file, script, SLUG, SLUG);
  const expect = [
    /hero.*template "parade" is not one of/,
    /potatoes.*steps\.crisp.*beat 9, but the narration has 5 beats/,
    /sauce.*steps\.stir is missing/,
    /mushrooms.*sounds\[0\]\.sound must be one of/,
    /patties.*chips\[0\]\.show\[1\].*"never"/,
    /build.*steps\.later is not a step of build/,
    /finish.*appears twice/,
  ];
  for (const re of expect) assert.ok(problems.some((p) => re.test(p)), `no problem matching ${re}:\n${problems.join("\n")}`);
  assert.equal(problems.length, expect.length, problems.join("\n"));
});

test("the check refuses bowl scenes for another recipe, and scenes the script lacks", () => {
  const problems = checkSceneFile(sceneFile(), { ...script, extra: [{ speak: "x", caption: "x" }] }, "chili", SLUG);
  assert.ok(problems.some((p) => /hero.*draws the smash-burger-bowl bowl/.test(p)));
  assert.ok(problems.some((p) => /scene "extra" is in the narration script but not the scene file/.test(p)));
});

test("the check names foods and kinds the kit does not have", () => {
  const file = sceneFile();
  const scenes = file.scenes as unknown as Record<string, unknown>[];
  scenes.find((s) => s.id === "potatoes")!.food = "carrot";
  (scenes.find((s) => s.id === "sauce")!.ingredients as Record<string, unknown>[])[1].as = "drizzle";
  (scenes.find((s) => s.id === "mushrooms")!.food as Record<string, unknown>[])[0].piece = "pepper";
  const problems = checkSceneFile(file, script, SLUG, SLUG);
  assert.ok(problems.some((p) => /food "carrot" is not in the kit yet/.test(p)));
  assert.ok(problems.some((p) => /ingredients\[1\]\.as must be one of/.test(p)));
  assert.ok(problems.some((p) => /food\[0\]\.piece "pepper" is not in the kit yet/.test(p)));
});
