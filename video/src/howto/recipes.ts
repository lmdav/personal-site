// Every recipe with a how-to video, found at bundle time: its scene file and narration
// script in src/recipes, and the narration timings narrate.py writes to src/data. A recipe
// without timings yet is left out until it is narrated. A scene file with problems stops
// the bundle with all of them listed.
import { BOWL_SLUG, items, samples } from "../three/bowlShot";
import { bakeOf, checkSceneFile, planVideo, totalFrames, type Planned, type SceneFile, type Script, type Timings } from "./scenes";

// webpack's require.context, which Remotion's bundler provides.
type Context = { keys(): string[]; (key: string): unknown };
declare const require: { context(dir: string, deep: boolean, match: RegExp): Context };

const sceneFiles = require.context("../recipes", false, /\.scenes\.json$/);
const scripts = require.context("../recipes", false, /\.narration\.json$/);
const timings = require.context("../data", false, /\.narration\.json$/);

export type Recipe = { slug: string; file: SceneFile; plan: Planned[]; frames: number };

const has = (ctx: Context, key: string) => ctx.keys().includes(key);
const bake = bakeOf({ frames: samples, items });

export const RECIPES: Recipe[] = sceneFiles
  .keys()
  .filter((key) => key.startsWith("./"))
  .flatMap((key) => {
    const slug = key.slice(2, -".scenes.json".length);
    const scriptKey = `./${slug}.narration.json`;
    if (!has(scripts, scriptKey)) throw new Error(`${slug}.scenes.json has no narration script (src/recipes/${slug}.narration.json)`);
    if (!has(timings, scriptKey)) return [];
    const raw = sceneFiles(key);
    const script = scripts(scriptKey) as Script;
    const problems = checkSceneFile(raw, script, slug, BOWL_SLUG);
    if (problems.length) throw new Error(`src/recipes/${slug}.scenes.json has problems:\n- ${problems.join("\n- ")}`);
    const file = raw as SceneFile;
    const plan = planVideo(file, script, timings(scriptKey) as Timings, bake);
    return [{ slug, file, plan, frames: totalFrames(plan) }];
  });

export function recipeOf(slug: string): Recipe {
  const recipe = RECIPES.find((r) => r.slug === slug);
  if (!recipe) throw new Error(`No how-to video for "${slug}". It needs src/recipes/${slug}.scenes.json, a narration script, and narration timings from narrate.py.`);
  return recipe;
}
