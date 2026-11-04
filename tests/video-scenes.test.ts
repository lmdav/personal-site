import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { checkPlan, checkSceneFile, fadeRanges, frameOf, planVideo, totalFrames, type SceneFile, type Script } from "../video/src/howto/scenes.ts";

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
const BAKE = { last: 149, firstRelease: [0, 10, 20, 30, 40] };
// The Smash Burger Bowl has five layers, so its pull-apart has six labels.
const BOWL = { layers: 5, labels: 6 };

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
  assert.deepEqual(checkSceneFile(sceneFile(), script, SLUG, BOWL), []);
});

test("the plan matches the hand-written video, scene by scene", () => {
  const plan = planVideo(sceneFile(), script, TIMINGS, BAKE);
  assert.deepEqual(checkPlan(plan), []);
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
  const problems = checkSceneFile(file, script, SLUG, BOWL);
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

test("the check refuses bowl scenes for a recipe with no baked bowl, and scenes the script lacks", () => {
  const problems = checkSceneFile(sceneFile(), { ...script, extra: [{ speak: "x", caption: "x" }] }, "chili", null);
  assert.ok(problems.some((p) => /hero.*no baked src\/recipes\/chili\.build\.json/.test(p)));
  assert.ok(problems.some((p) => /scene "extra" is in the narration script but not the scene file/.test(p)));
});

test("the check wants every layer of the bowl dropped exactly once", () => {
  const cases: [number[][], RegExp][] = [
    [[[0, 1], [2, 3]], /waves must drop each of the bowl's 5 layers exactly once/],
    [[[0, 1], [1, 2, 3, 4]], /waves must drop each of the bowl's 5 layers exactly once/],
  ];
  for (const [[cold, hot], expected] of cases) {
    const problems = planWith("build", (s) => (s.waves = { cold, hot }));
    assert.ok(problems.some((p) => expected.test(p)), problems.join("\n"));
  }
  assert.ok(planWith("build", (s) => delete s.waves).some((p) => /waves needs each step's list of layers/.test(p)));
});

test("the Beef Broccoli Bowls scene file checks out against its script and bowl", () => {
  const slug = "beef-broccoli-bowls";
  const bowl = read(`${slug}.build.json`);
  const file = read(`${slug}.scenes.json`) as SceneFile;
  const beef = read(`${slug}.narration.json`) as Script;
  const info = { layers: bowl.layers.length, labels: bowl.layers.length + 1 };
  assert.deepEqual(checkSceneFile(file, beef, slug, info), []);
  const scene = (id: string) => (file.scenes as unknown as Record<string, unknown>[]).find((s) => s.id === id)!;
  // Its new methods refuse what the kit cannot draw, and steps that name nothing.
  (scene("broccoli").food as Record<string, unknown>[])[0].piece = "kale";
  (scene("slice").foods as Record<string, unknown>[])[0].food = "tofu";
  (scene("eggs").steps as Record<string, unknown>).off = "never";
  scene("steak").cook = "boil";
  const problems = checkSceneFile(file, beef, slug, info);
  for (const re of [/food\[0\]\.piece "kale" is not in the kit yet \(broccoli\)/, /foods\[0\]\.food "tofu" is not in the kit yet/, /eggs.*steps\.off.*"never"/, /cook must be one of saute, smash, sear, char, eggs/])
    assert.ok(problems.some((p) => re.test(p)), `no problem matching ${re}:\n${problems.join("\n")}`);
});

test("the pot's steps must leave room, and a board cut must end inside its scene", () => {
  const slug = "beef-broccoli-bowls";
  const beef = read(`${slug}.narration.json`) as Script;
  const seconds = Object.fromEntries(Object.entries(beef).map(([id, beats]) => [id, beats.map((_, i) => i * 8)]));
  const timings = { durations: Object.fromEntries(Object.entries(seconds).map(([id, b]) => [id, b.length * 8])), beats: seconds };
  const bake = { last: 149, firstRelease: [0, 10, 20, 30, 40] };
  const file = read(`${slug}.scenes.json`) as SceneFile;
  const scene = (id: string) => (file.scenes as unknown as Record<string, unknown>[]).find((s) => s.id === id)!;
  assert.deepEqual(checkPlan(planVideo(file, beef, timings, bake)), []);
  Object.assign(scene("rice").steps as Record<string, unknown>, { rice: "b1", water: "b1+5" });
  (scene("slice").foods as Record<string, unknown>[])[1].cut = "end-5";
  const problems = checkPlan(planVideo(file, beef, timings, bake));
  assert.ok(problems.some((p) => /water must come at least 30 frames after rice/.test(p)), problems.join("\n"));
  assert.ok(problems.some((p) => /the end of the avocado cut is at frame \d+, outside the scene/.test(p)), problems.join("\n"));
});

test("the check names foods and kinds the kit does not have", () => {
  const file = sceneFile();
  const scenes = file.scenes as unknown as Record<string, unknown>[];
  scenes.find((s) => s.id === "potatoes")!.food = "carrot";
  (scenes.find((s) => s.id === "sauce")!.ingredients as Record<string, unknown>[])[1].as = "drizzle";
  (scenes.find((s) => s.id === "mushrooms")!.food as Record<string, unknown>[])[0].piece = "pepper";
  const problems = checkSceneFile(file, script, SLUG, BOWL);
  assert.ok(problems.some((p) => /food "carrot" is not in the kit yet/.test(p)));
  assert.ok(problems.some((p) => /ingredients\[1\]\.as must be one of/.test(p)));
  assert.ok(problems.some((p) => /food\[0\]\.piece "pepper" is not in the kit yet/.test(p)));
});

/** The Smash Burger Bowl's scene file with one scene changed, checked and planned. */
function planWith(id: string, change: (scene: Record<string, unknown>) => void) {
  const file = sceneFile();
  change((file.scenes as unknown as Record<string, unknown>[]).find((s) => s.id === id)!);
  const problems = checkSceneFile(file, script, SLUG, BOWL);
  return problems.length ? problems : checkPlan(planVideo(file, script, TIMINGS, BAKE));
}
const steps = (s: Record<string, unknown>) => s.steps as Record<string, unknown>;
const first = (s: Record<string, unknown>, key: string) => (s[key] as Record<string, unknown>[])[0];

test("a plan with times that would break a template is refused (2026-11-03 review)", () => {
  const cases: [string, (s: Record<string, unknown>) => void, RegExp][] = [
    ["sauce", (s) => ((s as { chips?: unknown }).chips = [{ text: "STIR", show: ["stir", "stir+10"], timer: ["stir", "stir"] }]), /"STIR" chip shows for 10 frames/],
    ["sauce", (s) => ((s as { chips?: unknown }).chips = [{ text: "STIR", show: ["b1", "b3"], timer: ["stir", "stir"] }]), /"STIR" chip's timer must end after it starts/],
    ["potatoes", (s) => (steps(s).cool = "b1+5"), /cool must come at least 23 frames after microwave/],
    ["potatoes", (s) => Object.assign(steps(s), { microwave: "b2", cool: "b1" }), /cool must come at least 23 frames after microwave \(it is -/],
    ["patties", (s) => (steps(s).flip = "b2"), /flip must come at least 1 frame after rest \(it is 0\)/],
    ["build", (s) => Object.assign(steps(s), { cold: "b2+200", hot: "b0" }), /hot .* comes too long before cold/],
    ["sauce", (s) => (first(s, "ingredients").lands = "b5+20"), /Greek yogurt lands at frame \d+, after the stir starts/],
    ["mushrooms", (s) => Object.assign(first(s, "sounds"), { at: "end-5", until: "b0" }), /a pan sound ends before it starts/],
    ["finish", (s) => ((s.side as Record<string, unknown>).at = "b1+900"), /the side dish is at frame \d+, outside the scene/],
    ["apart", (s) => ((s.labels as unknown[])[5] = "b5+900"), /label 5 is at frame \d+, outside the scene/],
  ];
  for (const [id, change, expected] of cases) {
    const problems = planWith(id, change);
    assert.ok(problems.some((p) => expected.test(p)), `${id}: no problem matching ${expected}:\n${problems.join("\n")}`);
  }
});

test("scene file fields that would break a render are refused (2026-11-03 review)", () => {
  const cases: [string, (s: Record<string, unknown>) => void, RegExp][] = [
    ["mushrooms", (s) => (first(s, "sounds").fade = 0), /sounds\[0\]\.fade needs a number above 0/],
    ["sauce", (s) => (first(s, "sounds").frames = "30"), /sounds\[0\]\.frames needs a whole number above 0/],
    ["sauce", (s) => (first(s, "ingredients").plop = { onset: 0, volume: 0.2 }), /plop needs an onset of 0\.03 s or more/],
    ["mushrooms", (s) => delete s.food, /food must be a list with at least one entry/],
    ["mushrooms", (s) => (s.food = [{ piece: "mushroom", count: 30 }]), /the pan has room for \d+ of the 30 slices/],
    ["apart", (s) => (s.labels = ["b1"]), /labels needs 6 times/],
    ["apart", (s) => delete s.labels, /labels must be a list/],
    ["patties", (s) => (s.cheese = "no"), /cheese must be true or false/],
    ["finish", (s) => (s.side = null), /side needs \{ food, at \}/],
    ["patties", (s) => (first(s, "chips").show = ["valueOf", "end"]), /"valueOf" names "valueOf", which is not a step or moment/],
  ];
  for (const [id, change, expected] of cases) {
    const problems = planWith(id, change);
    assert.ok(problems.some((p) => expected.test(p)), `${id}: no problem matching ${expected}:\n${problems.join("\n")}`);
  }
  const named = sceneFile();
  (named.scenes as unknown as Record<string, unknown>[])[0].id = "toString";
  assert.ok(checkSceneFile(named, script, SLUG, BOWL).some((p) => /"toString" is not a scene in the narration script/.test(p)));
});

test("narration timings that do not match the script are refused", () => {
  const stale = { ...TIMINGS, beats: { ...TIMINGS.beats, patties: [0, 4.397, 8.111] } };
  assert.throws(() => planVideo(sceneFile(), script, stale, BAKE), /patties" has 4 beats in the script but 3 in its narration timings; run narrate\.py/);
});
