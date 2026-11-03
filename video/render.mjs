// Renders a recipe's narrated how-to video in one run: a wide master and a vertical cut
// into out/, the web copy and poster for the recipe page into the site's public folder,
// then the frame and loudness checks on both cuts. Exits non-zero if any step or check
// fails, and stops a render that makes no progress for 2 minutes.
// Usage: pnpm render <slug>
// Needs the local Kokoro setup (see README.md) and the assets from tools/fetch-assets.mjs.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { BOWL_SLUG, bakeOf, checkPlan, checkSceneFile, fadeRanges, planVideo, totalFrames } from "./src/howto/scenes.ts";
import { checkLoudness } from "./tools/loudness.mjs";
import { watchProgress } from "./tools/watchdog.mjs";

const STALL_MS = 2 * 60 * 1000;
const videoDir = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error("Usage: pnpm render <slug>");
  process.exit(1);
}
const siteDir = path.join(videoDir, "..", "public", "recipes", slug);
const outDir = path.join(videoDir, "out");
const python = path.join(videoDir, ".venv", "bin", "python");
const started = Date.now();
const log = (text) => console.log(`[${((Date.now() - started) / 60000).toFixed(1)} min] ${text}`);

function run(cmd, args) {
  const { status, error } = spawnSync(cmd, args, { cwd: videoDir, stdio: "inherit" });
  if (error || status !== 0) {
    console.error(`\nStopped: ${[cmd, ...args].join(" ")} ${error ? `could not start (${error.message})` : `exited ${status}`}`);
    process.exit(1);
  }
}
const ffmpeg = (...args) => run("pnpm", ["exec", "remotion", "ffmpeg", "-v", "error", "-y", ...args]);
const json = (file) => JSON.parse(readFileSync(path.join(videoDir, file), "utf8"));

/** Runs a job that reports progress, cancelling it if it goes quiet for STALL_MS. */
async function watched(what, job) {
  const { cancelSignal, cancel } = makeCancelSignal();
  const watch = watchProgress({
    limitMs: STALL_MS,
    onStall: (ms) => {
      console.error(`\nStopped: ${what} made no progress for ${Math.round(ms / 1000)} s.`);
      cancel();
      // The bundler cannot be cancelled; leave it 10 s to wind down, then exit anyway.
      setTimeout(() => process.exit(1), 10_000).unref();
    },
  });
  try {
    return await job({ cancelSignal, progress: watch.progress });
  } catch (e) {
    if (watch.stalled) process.exit(1);
    throw e;
  } finally {
    watch.stop();
  }
}

// 1. Recipe data straight from the site's loader.
log("Exporting the recipe");
run("node", ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "export-recipe.mjs", slug]);
// 2. Narration, one clip per scene, with the timings the scenes follow.
log("Narrating");
run(python, ["narrate.py", slug]);

// 3. The plan the video draws: checked before anything renders.
const sceneFile = `src/recipes/${slug}.scenes.json`;
if (!existsSync(path.join(videoDir, sceneFile))) {
  console.error(`Stopped: ${sceneFile} does not exist. See docs/adr/0004-recipe-video-scene-files.md.`);
  process.exit(1);
}
const scenes = json(sceneFile);
const script = json(`src/recipes/${slug}.narration.json`);
function stopOn(problems) {
  if (!problems.length) return;
  console.error(`Stopped: ${sceneFile} has problems:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
const bowl = json(`src/recipes/${BOWL_SLUG}.build.json`);
stopOn(checkSceneFile(scenes, script, slug, { slug: BOWL_SLUG, labels: bowl.layers.length + 1 }));
const plan = planVideo(scenes, script, json(`src/data/${slug}.narration.json`), bakeOf(json(`src/data/${BOWL_SLUG}.drop.json`)));
stopOn(checkPlan(plan));
const frames = totalFrames(plan);
log(`${plan.length} scenes, ${frames} frames (${(frames / 30).toFixed(1)} s)`);

// 4. Both cuts from one bundle. ANGLE is the GL backend that draws the 3D scenes; without
// it the render stalls.
mkdirSync(outDir, { recursive: true });
mkdirSync(siteDir, { recursive: true });
log("Bundling");
const serveUrl = await watched("the bundle", ({ progress }) => bundle({ entryPoint: path.join(videoDir, "src", "index.ts"), onProgress: progress }));
const chromiumOptions = { gl: "angle" };
const browser = await openBrowser("chrome", { chromiumOptions });
const cuts = [slug, `${slug}-vertical`];
try {
  for (const id of cuts) {
    const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions });
    if (composition.durationInFrames !== frames) throw new Error(`${id} is ${composition.durationInFrames} frames, but the plan says ${frames}`);
    log(`Rendering ${id}`);
    let shown = -1;
    await watched(`the ${id} render`, ({ cancelSignal, progress }) =>
      renderMedia({
        serveUrl,
        composition,
        codec: "h264",
        crf: 20,
        concurrency: 5,
        chromiumOptions,
        puppeteerInstance: browser,
        outputLocation: path.join(outDir, `${id}.mp4`),
        overwrite: true,
        cancelSignal,
        onProgress: ({ renderedFrames, encodedFrames, stitchStage, progress: done }) => {
          progress(`${renderedFrames}/${encodedFrames}/${stitchStage}`);
          const tenth = Math.floor(done * 10);
          if (tenth > shown) {
            shown = tenth;
            log(`${id}: ${tenth * 10}% (${renderedFrames} of ${frames} frames drawn)`);
          }
        },
      }),
    );
  }
} finally {
  await browser.close({ silent: true });
}

// 5. The web copy: smaller, starting to play before it has fully loaded.
const master = path.join(outDir, `${slug}.mp4`);
log("Writing the web copy and poster");
ffmpeg("-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", path.join(siteDir, "how-to.mp4"));
// 6. The poster: the finished bowl with no title or caption (the <slug>-poster still).
const posterStill = await selectComposition({ serveUrl, id: `${slug}-poster`, chromiumOptions });
await renderStill({ serveUrl, composition: posterStill, output: path.join(siteDir, "how-to-poster.jpg"), imageFormat: "jpeg", jpegQuality: 88, chromiumOptions, overwrite: true });

// 7. Checks on both cuts: blank or glitched frames outside the fades, and the mix.
const failures = [];
const fades = fadeRanges(plan)
  .map(([a, b]) => `${a}-${b}`)
  .join(",");
const voices = plan.map((p) => ({ id: p.scene.id, voice: p.voice, clip: path.join(videoDir, "public", slug, "narration", `${p.scene.id}.wav`) }));
for (const id of cuts) {
  const file = path.join(outDir, `${id}.mp4`);
  log(`Checking frames: ${id}`);
  const frameCheck = spawnSync(python, ["tools/check_frames.py", file, "--fades", fades], { cwd: videoDir, stdio: "inherit" });
  if (frameCheck.status !== 0) failures.push(`${id}: the frame check failed (see above)`);
  log(`Checking loudness: ${id}`);
  const loud = checkLoudness(file, voices);
  console.log(loud.lines.join("\n"));
  failures.push(...loud.failures.map((f) => `${id}: ${f}`));
}

log(failures.length ? "Done, with failed checks" : "Done. Both cuts, the web copy, and the poster pass their checks.");
for (const f of failures) console.error(`- ${f}`);
console.log(`\n${cuts.map((id) => path.join(outDir, `${id}.mp4`)).join("\n")}\n${path.join(siteDir, "how-to.mp4")}\n${path.join(siteDir, "how-to-poster.jpg")}`);
process.exit(failures.length ? 1 : 0);
