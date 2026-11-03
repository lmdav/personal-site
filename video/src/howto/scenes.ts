// A recipe's video as data (docs/adr/0004-recipe-video-scene-files.md): the scene file
// (src/recipes/<slug>.scenes.json) names a template per scene and gives it the recipe's
// steps, chips, list rows, and sounds. This module checks a scene file, turns its times
// into frames, and lays out the whole video. It has no React or Remotion imports, so the
// render command (render.mjs) and the tests share the same plan the video draws.
import { panLayout, type SkilletPiece } from "./skillet.ts";

export const FPS = 30;
export const LEAD = 12; // frames before the narration starts
export const TAIL = 30; // frames after it ends, a hold to take each step in
export const FADE = 9; // frames a fade to or from the backdrop takes (overlay.tsx)

/** A time in a scene: a frame number, or "b3" (narration beat 3), "end" (the scene's
 * length), or a step or moment name, each with an optional +N or -N in frames. */
export type When = string | number;
export type Window = [When, When];

export const CUE_SOUNDS = ["sizzle", "pan", "crackle", "plop", "stir"] as const;
export type CueSound = (typeof CUE_SOUNDS)[number];
/** One cooking sound, in scene frames: which file, when it starts, how long it plays, how
 * loud, where in the file to start (seconds), and how many frames to fade in and out. */
export type Cue = { sound: CueSound; at: number; len: number; volume: number; from?: number; fade?: number };

export type ChipData = { text: string; show: Window; timer?: Window };
export type SoundData = { sound: CueSound; at: When; until?: When; frames?: number; volume: number; offset?: number; fade?: number };

export const MIX_KINDS = ["base", "dollop", "pieces", "pour", "specks"] as const;
export type MixIngredient = {
  amount: string;
  name: string;
  lands: When;
  /** How it goes in: base (a mound of the main ingredient), dollop (a small glossy mound),
   * pieces (chopped bits from the kit), pour (a thin stream and a puddle), specks (a
   * spice). */
  as: (typeof MIX_KINDS)[number];
  color?: string;
  piece?: "pickle";
  /** A plop as it lands: where in the plop file it starts (seconds), and how loud. */
  plop?: { onset: number; volume: number };
};
export type { SkilletPiece };

type Base = { id: string; fade: "in" | "out" | "both" | "none" };
export type SceneData = Base &
  (
    | { template: "hero" }
    | { template: "pullApart"; labels: When[] }
    | { template: "prep"; food: "potato"; steps: Record<"poke" | "microwave" | "cool" | "press" | "crisp", When>; chips?: ChipData[]; sounds?: SoundData[] }
    | { template: "mix"; color: string; steps: Record<"stir", When>; ingredients: MixIngredient[]; sounds?: SoundData[] }
    | { template: "skillet"; cook: "saute"; camera: [number, number]; food: { piece: SkilletPiece; count: number }[]; steps: Record<"add" | "stir", When>; chips?: ChipData[]; sounds?: SoundData[] }
    | { template: "skillet"; cook: "smash"; camera: [number, number]; cheese?: boolean; parchment?: boolean; steps: Record<"heat" | "add" | "rest" | "flip", When>; chips?: ChipData[]; sounds?: SoundData[] }
    | { template: "build"; steps: Record<"cold" | "hot", When> }
    | { template: "finish"; steps: Record<"drizzle" | "card", When>; side?: { food: "beans"; at: When } }
  );
export type Template = SceneData["template"];

export type SceneFile = { title: string; facts: string[]; endCard: string; scenes: SceneData[] };
/** The narration script: per scene, its beats, each spoken and captioned. */
export type Script = Record<string, { speak: string; caption: string }[]>;
/** What narrate.py records: each scene's clip length and when each beat starts, in seconds. */
export type Timings = { durations: Record<string, number>; beats: Record<string, number[]> };
/** What the build scene needs from the physics bake: its last sample and the sample the
 * first hot layer is released at. */
export type Bake = { last: number; hotFirst: number };

const STEPS: Partial<Record<Template, readonly string[]>> = {
  prep: ["poke", "microwave", "cool", "press", "crisp"],
  mix: ["stir"],
  build: ["cold", "hot"],
  finish: ["drizzle", "card"],
};
const SKILLET_STEPS = { saute: ["add", "stir"], smash: ["heat", "add", "rest", "flip"] } as const;
/** Templates that draw the finished bowl. They read the bowl's build file and bake. */
export const BOWL_TEMPLATES: readonly Template[] = ["hero", "pullApart", "build", "finish"];
const TEMPLATES: readonly Template[] = ["hero", "pullApart", "prep", "mix", "skillet", "build", "finish"];

export const bakeOf = (drop: { frames: unknown[]; items: { layer: number; release: number }[] }): Bake => ({
  last: drop.frames.length - 1,
  hotFirst: Math.min(...drop.items.filter((it) => it.layer >= 2).map((it) => it.release)),
});

export function stepsOf(scene: SceneData): readonly string[] {
  if (scene.template === "skillet") return SKILLET_STEPS[scene.cook];
  return STEPS[scene.template] ?? [];
}

/** Named moments a template defines from its steps, for timing sounds to the action. */
export function momentsOf(scene: SceneData, steps: Record<string, number>): Record<string, number> {
  // The first ball lands 4 frames after "add", the first press is 50 frames after it, and
  // the first patty turns 4 frames after "flip" (panScenes.tsx, pattyTimes).
  if (scene.template === "skillet" && scene.cook === "smash") return { lands: steps.add + 4, smash: steps.add + 50, turn: steps.flip + 4 };
  return {};
}

/** The fewest frames a scene's action needs, given its steps. */
export function minFrames(scene: SceneData, steps: Record<string, number>, bake: Bake): number {
  switch (scene.template) {
    case "prep":
      return steps.crisp + 96; // the crisping runs 86 frames, then a short hold
    case "mix":
      return steps.stir + 82; // the stir and the spoon lifting out
    case "skillet":
      return scene.cook === "smash" ? steps.flip + 100 : 0; // the flip and the cheese melting
    case "build":
      return Math.max(steps.cold + 2 + bake.last, steps.hot + 2 + bake.last - bake.hotFirst);
    default:
      return 0;
  }
}

const WHEN = /^(b\d+|end|[a-z][a-zA-Z]*)\s*(?:([+-])\s*(\d+))?$/;

/** A time as a frame in its scene. names holds the steps and moments; end is the scene's
 * length, or undefined while the length is still being worked out. Throws on a time that
 * names nothing. */
export function frameOf(when: When, beats: number[], names: Record<string, number>, end?: number): number {
  if (typeof when === "number") {
    if (!Number.isInteger(when)) throw new Error(`${when} is not a whole frame`);
    return when;
  }
  const m = WHEN.exec(String(when).trim());
  if (!m) throw new Error(`"${when}" is not a time (try "b2", "b2+10", "end-6", or a step name)`);
  const [, anchor, sign, n] = m;
  let base: number;
  if (anchor.startsWith("b") && /^b\d+$/.test(anchor)) {
    const i = Number(anchor.slice(1));
    if (i >= beats.length) throw new Error(`"${when}" names beat ${i}, but the narration has ${beats.length} beat${beats.length === 1 ? "" : "s"} here`);
    base = beats[i];
  } else if (anchor === "end") {
    if (end === undefined) throw new Error(`"${when}" uses the scene's end, which steps cannot`);
    base = end;
  } else if (Object.hasOwn(names, anchor)) {
    base = names[anchor];
  } else {
    throw new Error(`"${when}" names "${anchor}", which is not a step or moment of this scene (${Object.keys(names).join(", ") || "none"})`);
  }
  return base + (sign === "-" ? -1 : 1) * Number(n ?? 0);
}

/** The bowl the bowl templates draw: its recipe, and how many labels its pull-apart has
 * (one per layer, plus the sauce). */
export type BowlInfo = { slug: string; labels: number };

/** Checks a scene file against the narration script and lists every problem. Times are
 * checked against made-up beats here, for names and beat numbers; checkPlan checks them
 * against the real narration once it is timed. */
export function checkSceneFile(raw: unknown, script: Script, slug: string, bowl: BowlInfo): string[] {
  const problems: string[] = [];
  const bad = (where: string, what: string) => problems.push(`${where}: ${what}`);
  if (!isObject(raw)) return ["the scene file is not a JSON object"];
  for (const key of ["title", "endCard"]) if (typeof raw[key] !== "string" || !raw[key]) bad(key, "needs text");
  if (!Array.isArray(raw.facts) || !raw.facts.every((f) => typeof f === "string")) bad("facts", "needs a list of text lines");
  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) return [...problems, "scenes: needs a list of scenes"];

  const ids = raw.scenes.map((s) => (isObject(s) ? s.id : undefined));
  for (const id of Object.keys(script)) if (!ids.includes(id)) problems.push(`scene "${id}" is in the narration script but not the scene file`);
  raw.scenes.forEach((s, i) => {
    const where = `scenes[${i}]${isObject(s) && typeof s.id === "string" ? ` (${s.id})` : ""}`;
    if (!isObject(s)) return bad(where, "is not an object");
    if (typeof s.id !== "string" || !Object.hasOwn(script, s.id)) return bad(where, `id ${JSON.stringify(s.id)} is not a scene in the narration script`);
    if (ids.indexOf(s.id) !== i) bad(where, "appears twice");
    if (!["in", "out", "both", "none"].includes(String(s.fade))) bad(where, 'fade must be "in", "out", "both", or "none"');
    if (!TEMPLATES.includes(s.template as Template)) return bad(where, `template ${JSON.stringify(s.template)} is not one of ${TEMPLATES.join(", ")}`);
    const scene = s as SceneData;
    if (BOWL_TEMPLATES.includes(scene.template) && slug !== bowl.slug)
      bad(where, `the ${scene.template} template draws the ${bowl.slug} bowl; per-recipe bowls come with the kit (playbook item C)`);
    if (scene.template === "skillet" && !["saute", "smash"].includes(scene.cook)) return bad(where, 'cook must be "saute" or "smash"');
    // Every time must resolve, using made-up beat frames: only the names and beat numbers matter.
    const beats = script[scene.id].map((_, k) => k * 100);
    const steps: Record<string, number> = {};
    const stepData = (isObject(s.steps) ? s.steps : {}) as Record<string, When>;
    for (const name of stepsOf(scene)) {
      // A missing step still gets a frame, so times that name it are not reported twice.
      if (name in stepData) {
        steps[name] = tryFrame(stepData[name], beats, {}, undefined, `${where} steps.${name}`, problems);
      } else {
        steps[name] = 0;
        bad(where, `steps.${name} is missing`);
      }
    }
    for (const name of Object.keys(stepData)) if (!stepsOf(scene).includes(name)) bad(where, `steps.${name} is not a step of ${scene.template} (${stepsOf(scene).join(", ") || "none"})`);
    const names = { ...steps, ...momentsOf(scene, steps) };
    const time = (w: unknown, at: string) => tryFrame(w as When, beats, names, 10_000, `${where} ${at}`, problems);
    checkTemplate(scene, where, time, bad, bowl, () => problems.length);
  });
  return problems;
}

function checkTemplate(scene: SceneData, where: string, time: (w: unknown, at: string) => void, bad: (where: string, what: string) => void, bowl: BowlInfo, problemCount: () => number) {
  /** A list field: optional ones may be left out, required ones need at least one entry. */
  const list = (v: unknown, at: string, required = false) => {
    if ((v !== undefined || required) && (!Array.isArray(v) || (required && v.length === 0))) bad(where, `${at} must be a list${required ? " with at least one entry" : ""}`);
    return Array.isArray(v) ? v : [];
  };
  const positive = (v: unknown, at: string, whole = false) => {
    if (v !== undefined && (typeof v !== "number" || !(v > 0) || (whole && !Number.isInteger(v)))) bad(where, `${at} needs a ${whole ? "whole " : ""}number above 0`);
  };
  if ("chips" in scene)
    list(scene.chips, "chips").forEach((c: ChipData, k) => {
      if (typeof c?.text !== "string") bad(where, `chips[${k}].text needs text`);
      if (!Array.isArray(c?.show) || c.show.length !== 2) bad(where, `chips[${k}].show needs [from, to]`);
      else c.show.forEach((w, j) => time(w, `chips[${k}].show[${j}]`));
      if (c?.timer !== undefined) {
        if (!Array.isArray(c.timer) || c.timer.length !== 2) bad(where, `chips[${k}].timer needs [from, to]`);
        else c.timer.forEach((w, j) => time(w, `chips[${k}].timer[${j}]`));
      }
    });
  if ("sounds" in scene)
    list(scene.sounds, "sounds").forEach((c: SoundData, k) => {
      if (!CUE_SOUNDS.includes(c?.sound)) bad(where, `sounds[${k}].sound must be one of ${CUE_SOUNDS.join(", ")}`);
      if (typeof c?.volume !== "number" || c.volume < 0) bad(where, `sounds[${k}].volume needs a number of 0 or more`);
      positive(c?.fade, `sounds[${k}].fade`);
      positive(c?.frames, `sounds[${k}].frames`, true);
      if (c?.offset !== undefined && !(typeof c.offset === "number" && c.offset >= 0)) bad(where, `sounds[${k}].offset needs a number of seconds, 0 or more`);
      time(c?.at, `sounds[${k}].at`);
      if ((c?.until === undefined) === (c?.frames === undefined)) bad(where, `sounds[${k}] needs either until or frames`);
      if (c?.until !== undefined) time(c.until, `sounds[${k}].until`);
    });
  switch (scene.template) {
    case "pullApart": {
      const labels = list(scene.labels, "labels", true);
      if (labels.length && labels.length !== bowl.labels) bad(where, `labels needs ${bowl.labels} times, one per layer of the bowl and one for the sauce`);
      labels.forEach((w, k) => time(w, `labels[${k}]`));
      break;
    }
    case "prep":
      // The data is unchecked here, so read it as it came.
      if ((scene.food as string) !== "potato") bad(where, `food ${JSON.stringify(scene.food as unknown)} is not in the kit yet (potato)`);
      break;
    case "mix": {
      if (typeof scene.color !== "string") bad(where, "color needs the stirred color, like #EDB38A");
      const rows = list(scene.ingredients, "ingredients", true) as MixIngredient[];
      const count = (kind: string) => rows.filter((r) => r?.as === kind).length;
      if (count("base") !== 1) bad(where, "ingredients need exactly one base");
      if (count("dollop") > DOLLOP_SLOTS) bad(where, `ingredients can have at most ${DOLLOP_SLOTS} dollops`);
      if (count("pieces") > 1 || count("pour") > 1) bad(where, "ingredients can have at most one pieces and one pour");
      rows.forEach((r, k) => {
        if (typeof r?.amount !== "string" || typeof r?.name !== "string") bad(where, `ingredients[${k}] needs an amount and a name`);
        if (!MIX_KINDS.includes(r?.as)) bad(where, `ingredients[${k}].as must be one of ${MIX_KINDS.join(", ")}`);
        if (["dollop", "pour", "specks"].includes(r?.as) && typeof r.color !== "string") bad(where, `ingredients[${k}] (${r.as}) needs a color`);
        if (r?.as === "pieces" && r.piece !== "pickle") bad(where, `ingredients[${k}].piece ${JSON.stringify(r.piece)} is not in the kit yet (pickle)`);
        if (r?.plop !== undefined && !(typeof r.plop?.onset === "number" && r.plop.onset >= 0.03 && typeof r.plop.volume === "number" && r.plop.volume >= 0))
          bad(where, `ingredients[${k}].plop needs an onset of 0.03 s or more and a volume of 0 or more`);
        time(r?.lands, `ingredients[${k}].lands`);
      });
      break;
    }
    case "skillet":
      if (!Array.isArray(scene.camera) || scene.camera.length !== 2 || !scene.camera.every((n) => typeof n === "number")) bad(where, "camera needs [from, to] angles in radians");
      if (scene.cook === "saute") {
        const food = list(scene.food, "food", true);
        const before = problemCount();
        food.forEach((p, k) => {
          if (!["mushroom", "onion"].includes(p?.piece)) bad(where, `food[${k}].piece ${JSON.stringify(p?.piece)} is not in the kit yet (mushroom, onion)`);
          if (!Number.isInteger(p?.count) || p.count < 1) bad(where, `food[${k}].count needs a whole number`);
        });
        if (food.length && problemCount() === before) {
          const asked = food.reduce((n, p) => n + p.count, 0);
          const placed = panLayout(food).length;
          if (placed < asked) bad(where, `the pan has room for ${placed} of the ${asked} slices in one layer`);
        }
      } else {
        for (const flag of ["cheese", "parchment"] as const) if (scene[flag] !== undefined && typeof scene[flag] !== "boolean") bad(where, `${flag} must be true or false`);
      }
      break;
    case "finish":
      if (scene.side !== undefined) {
        if (!isObject(scene.side)) {
          bad(where, "side needs { food, at }");
          break;
        }
        if (scene.side.food !== "beans") bad(where, `side.food ${JSON.stringify(scene.side.food)} is not in the kit yet (beans)`);
        time(scene.side.at, "side.at");
      }
      break;
  }
}

/** How many dollops the mix template has places for. */
export const DOLLOP_SLOTS = 3;

function tryFrame(when: When, beats: number[], names: Record<string, number>, end: number | undefined, where: string, problems: string[]) {
  try {
    if (when === undefined) throw new Error("is missing");
    return frameOf(when, beats, names, end);
  } catch (e) {
    problems.push(`${where}: ${(e as Error).message}`);
    return 0;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A scene placed in the video, with every time turned into a scene frame. */
export type Planned = {
  scene: SceneData;
  from: number;
  len: number;
  beats: number[];
  /** Where the narration plays, in video frames. */
  voice: [number, number];
  captions: string[];
  /** Steps and moments, in scene frames. */
  at: Record<string, number>;
  /** Resolves any other time in this scene. */
  frame: (when: When) => number;
  chips: { text: string; show: [number, number]; timer?: [number, number] }[];
  cues: Cue[];
};

/** Lays out the whole video from a checked scene file and the narration's timings. */
export function planVideo(file: SceneFile, script: Script, timings: Timings, bake: Bake): Planned[] {
  let from = 0;
  return file.scenes.map((scene) => {
    const starts = timings.beats[scene.id];
    const seconds = timings.durations[scene.id];
    if (!starts || seconds === undefined) throw new Error(`No narration timings for scene "${scene.id}"; run narrate.py`);
    if (starts.length !== script[scene.id].length) throw new Error(`Scene "${scene.id}" has ${script[scene.id].length} beats in the script but ${starts.length} in its narration timings; run narrate.py`);
    const beats = starts.map((t) => LEAD + Math.round(t * FPS));
    const spoken = Math.round(seconds * FPS);
    const stepData = ("steps" in scene ? scene.steps : {}) as Record<string, When>;
    const steps = Object.fromEntries(Object.entries(stepData).map(([k, w]) => [k, frameOf(w, beats, {})]));
    const at = { ...steps, ...momentsOf(scene, steps) };
    const len = Math.max(LEAD + spoken + TAIL, minFrames(scene, steps, bake));
    const frame = (w: When) => frameOf(w, beats, at, len);
    const pair = (w: Window): [number, number] => [frame(w[0]), frame(w[1])];
    const chips = ("chips" in scene ? (scene.chips ?? []) : []).map((c) => ({ text: c.text, show: pair(c.show), timer: c.timer && pair(c.timer) }));
    const planned: Planned = { scene, from, len, beats, voice: [from + LEAD, from + LEAD + spoken], captions: script[scene.id].map((b) => b.caption), at, frame, chips, cues: cuesOf(scene, frame) };
    from += len;
    return planned;
  });
}

function cuesOf(scene: SceneData, frame: (w: When) => number): Cue[] {
  const cues: Cue[] = [];
  // In the mix, each ingredient can plop as it lands (one frame early, so the sound's
  // attack meets the landing), from its own spot in the plop file.
  if (scene.template === "mix")
    for (const r of scene.ingredients)
      if (r.plop) cues.push({ sound: "plop", at: frame(r.lands) - 1, len: 8, from: r.plop.onset - 0.03, volume: r.plop.volume, fade: 2 });
  for (const c of "sounds" in scene ? (scene.sounds ?? []) : []) {
    const at = frame(c.at);
    cues.push({ sound: c.sound, at, len: c.until !== undefined ? frame(c.until) - at : (c.frames as number), volume: c.volume, from: c.offset, fade: c.fade });
  }
  return cues;
}

/** Checks a planned video against what the templates need from real frames: steps in
 * order with room between them, chip windows long enough to fade in and out, sounds that
 * start before they end, and every time inside its scene. Lists every problem. */
export function checkPlan(plan: Planned[]): string[] {
  const problems: string[] = [];
  for (const { scene, len, at, frame, chips, cues } of plan) {
    const bad = (what: string) => problems.push(`scene "${scene.id}": ${what}`);
    const inside = (f: number, what: string) => {
      if (f < 0 || f >= len) bad(`${what} is at frame ${f}, outside the scene (0 to ${len - 1})`);
    };
    /** Steps that must come in this order, each at least gap frames after the one before. */
    const order = (names: string[], gap: Record<string, number> = {}) =>
      names.slice(1).forEach((name, i) => {
        const need = gap[name] ?? 1;
        if (at[name] - at[names[i]] < need) bad(`${name} must come at least ${need} frame${need === 1 ? "" : "s"} after ${names[i]} (it is ${at[name] - at[names[i]]})`);
      });
    for (const name of stepsOf(scene)) inside(at[name], `step ${name}`);
    chips.forEach(({ text, show, timer }) => {
      if (show[1] - show[0] <= 16) bad(`the "${text}" chip shows for ${show[1] - show[0]} frames; it needs more than 16 to fade in and out`);
      if (timer && timer[1] <= timer[0]) bad(`the "${text}" chip's timer must end after it starts`);
      [...show, ...(timer ?? [])].forEach((f) => inside(Math.min(f, len - 1), `the "${text}" chip`));
    });
    cues.forEach((c) => {
      if (c.len < 1) bad(`a ${c.sound} sound ends before it starts`);
      inside(c.at, `a ${c.sound} sound`);
    });
    switch (scene.template) {
      case "prep":
        // The microwave's glow fades in over 10 frames and out over 12.
        order(["poke", "microwave", "cool", "press", "crisp"], { cool: 23 });
        break;
      case "mix":
        for (const r of scene.ingredients) if (frame(r.lands) >= at.stir) bad(`${r.name} lands at frame ${frame(r.lands)}, after the stir starts (${at.stir})`);
        for (const r of scene.ingredients) inside(frame(r.lands), r.name);
        break;
      case "skillet":
        order(scene.cook === "smash" ? ["heat", "add", "rest", "flip"] : ["add", "stir"]);
        break;
      case "pullApart":
        scene.labels.forEach((w, k) => inside(frame(w), `label ${k}`));
        break;
      case "build":
        // The camera closes in from "cold" until 100 frames after "hot".
        if (at.hot + 100 <= at.cold + 2) bad(`hot (${at.hot}) comes too long before cold (${at.cold})`);
        break;
      case "finish":
        if (scene.side) inside(frame(scene.side.at), "the side dish");
        break;
    }
  }
  return problems;
}

/** The video's total length in frames. */
export const totalFrames = (plan: Planned[]) => plan.reduce((sum, s) => sum + s.len, 0);

/** Frame ranges where the picture fades to or from the backdrop, for the frame check. */
export function fadeRanges(plan: Planned[]): [number, number][] {
  const out: [number, number][] = [];
  for (const { scene, from, len } of plan) {
    if (scene.fade === "in" || scene.fade === "both") out.push([from, from + FADE]);
    if (scene.fade === "out" || scene.fade === "both") out.push([from + len - FADE, from + len - 1]);
  }
  return out;
}
