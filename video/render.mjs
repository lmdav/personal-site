// Renders a recipe's narrated how-to video in one run: a wide master and a vertical cut
// into out/, the web copy and poster for the recipe page into the site's public folder,
// then the frame and loudness checks on both cuts. The site's copies are written only once
// both cuts pass. Exits non-zero if any step or check fails. Stops a render that makes no
// progress for 2 minutes (10 while it mixes the audio after the last frame) or runs past
// an hour, and gives every other step a time limit.
// Usage: pnpm render <slug>
// Needs the local Kokoro setup (see README.md) and the assets from tools/fetch-assets.mjs.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { BOWL_SLUG, bakeOf, checkPlan, checkSceneFile, fadeRanges, planVideo, totalFrames } from "./src/howto/scenes.ts";
import { checkNarration } from "./tools/check-narration.mjs";
import { checkLoudness } from "./tools/loudness.mjs";
import { watchProgress } from "./tools/watchdog.mjs";

const MINUTE = 60 * 1000;
const STALL_MS = 2 * MINUTE;
// After the last frame, Remotion mixes the audio without reporting progress.
const AUDIO_MS = 10 * MINUTE;
// A cut takes about 10 minutes; one that crawls past an hour is stuck.
const CUT_MS = 60 * MINUTE;
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

function run(cmd, args, timeout = 15 * MINUTE) {
  const { status, error } = spawnSync(cmd, args, { cwd: videoDir, stdio: "inherit", timeout });
  if (error || status !== 0) {
    const why = error?.code === "ETIMEDOUT" ? `ran past ${timeout / MINUTE} min` : error ? `could not start (${error.message})` : `exited ${status}`;
    console.error(`\nStopped: ${[cmd, ...args].join(" ")} ${why}`);
    process.exit(1);
  }
}
/** Stops the run if a promise has not settled within ms. */
function within(ms, what, promise) {
  let timer;
  const late = new Promise((_, reject) => (timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / MINUTE} min`)), ms)));
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}
const ffmpeg = (...args) => run("pnpm", ["exec", "remotion", "ffmpeg", "-v", "error", "-y", ...args]);
const json = (file) => JSON.parse(readFileSync(path.join(videoDir, file), "utf8"));

/** Runs a job that reports progress, cancelling it if it goes quiet for STALL_MS. */
async function watched(what, job) {
  const { cancelSignal, cancel } = makeCancelSignal();
  const watch = watchProgress({
    limitMs: STALL_MS,
    maxMs: CUT_MS,
    onStall: (ms, why) => {
      // A gap of hours means the computer slept (on 2026-11-03 it hibernated mid-render).
      const hint = ms > 30 * MINUTE ? " If the computer slept, run it again on power." : "";
      console.error(`\nStopped: ${what} ${why === "deadline" ? `ran past ${CUT_MS / MINUTE} min` : `made no progress for ${Math.round(ms / 1000)} s`}.${hint}`);
      cancel();
      // The bundler cannot be cancelled; leave it 10 s to wind down, then exit anyway.
      setTimeout(() => process.exit(1), 10_000).unref();
    },
  });
  try {
    const result = await job({ cancelSignal, progress: watch.progress });
    // A job that finishes after its stall was reported still fails the run.
    if (watch.stalled) process.exit(1);
    return result;
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
// 3. Every spoken line, transcribed by whisper.cpp, must match the script, so a word the
// voice gets wrong stops the run before anything renders.
log("Checking the narration with whisper");
{
  const heard = checkNarration({ slug, script: json(`src/recipes/${slug}.narration.json`), timings: json(`src/data/${slug}.narration.json`) });
  if (heard.failures.length) {
    console.error(`Stopped: ${heard.failures.length} narration line${heard.failures.length === 1 ? "" : "s"} did not match the script:\n- ${heard.failures.join("\n- ")}`);
    console.error("Fix the word in narrate.py's PRONOUNCE dictionary (or the script), then run this again.");
    process.exit(1);
  }
  log(`All ${heard.lines.length} lines match the script`);
}

// 4. The plan the video draws: checked before anything renders.
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

// 5. Both cuts from one bundle. ANGLE is the GL backend that draws the 3D scenes; without
// it the render stalls.
mkdirSync(outDir, { recursive: true });
// The bundle copies public/ (about 60 MB), so it goes in a scratch folder removed on exit.
const scratch = mkdtempSync(path.join(tmpdir(), "recipe-video-"));
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
log("Bundling");
const serveUrl = await watched("the bundle", ({ progress }) => bundle({ entryPoint: path.join(videoDir, "src", "index.ts"), outDir: path.join(scratch, "bundle"), onProgress: progress }));
const chromiumOptions = { gl: "angle" };
const browser = await within(3 * MINUTE, "Starting the browser", openBrowser("chrome", { chromiumOptions }));
const cuts = [slug, `${slug}-vertical`];
try {
  for (const id of cuts) {
    const composition = await within(3 * MINUTE, `Loading ${id}`, selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions }));
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
          progress(`${renderedFrames}/${encodedFrames}/${stitchStage}`, renderedFrames >= frames ? AUDIO_MS : STALL_MS);
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
  await within(MINUTE, "Closing the browser", browser.close({ silent: true })).catch((e) => console.error(e.message));
}

// 6. Checks on both cuts: blank or glitched frames outside the fades, and the mix.
const failures = [];
const fades = fadeRanges(plan)
  .map(([a, b]) => `${a}-${b}`)
  .join(",");
const voices = plan.map((p) => ({ id: p.scene.id, voice: p.voice, clip: path.join(videoDir, "public", slug, "narration", `${p.scene.id}.wav`) }));
for (const id of cuts) {
  const file = path.join(outDir, `${id}.mp4`);
  log(`Checking frames: ${id}`);
  const frameCheck = spawnSync(python, ["tools/check_frames.py", file, "--fades", fades], { cwd: videoDir, stdio: "inherit", timeout: 15 * MINUTE });
  if (frameCheck.status !== 0) failures.push(`${id}: the frame check ${frameCheck.error ? `could not run (${frameCheck.error.message})` : "failed (see above)"}`);
  log(`Checking loudness: ${id}`);
  try {
    const loud = checkLoudness(file, voices);
    console.log(loud.lines.join("\n"));
    failures.push(...loud.failures.map((f) => `${id}: ${f}`));
  } catch (e) {
    failures.push(`${id}: the loudness check could not run (${e.message})`);
  }
}
if (failures.length) {
  log("Stopped: the cuts failed their checks, so the site's video and poster were left as they were.");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

// 7. The web copy, smaller and starting to play before it has fully loaded, and the
// poster: the finished bowl with no title or caption (the <slug>-poster still). Both are
// made in out/ and copied to the site once made.
const master = path.join(outDir, `${slug}.mp4`);
const web = path.join(outDir, `${slug}-web.mp4`);
const poster = path.join(outDir, `${slug}-poster.jpg`);
log("Writing the web copy and poster");
ffmpeg("-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", web);
const posterStill = await within(3 * MINUTE, "Loading the poster", selectComposition({ serveUrl, id: `${slug}-poster`, chromiumOptions }));
await within(5 * MINUTE, "Rendering the poster", renderStill({ serveUrl, composition: posterStill, output: poster, imageFormat: "jpeg", jpegQuality: 88, chromiumOptions, overwrite: true }));
mkdirSync(siteDir, { recursive: true });
copyFileSync(web, path.join(siteDir, "how-to.mp4"));
copyFileSync(poster, path.join(siteDir, "how-to-poster.jpg"));

log("Done. Both cuts pass the frame and loudness checks, and the web copy and poster are in the site.");
console.log(`\n${cuts.map((id) => path.join(outDir, `${id}.mp4`)).join("\n")}\n${path.join(siteDir, "how-to.mp4")}\n${path.join(siteDir, "how-to-poster.jpg")}`);
