// Renders a recipe's narrated how-to video: a wide master and a vertical cut into out/,
// and the web copy and poster for the recipe page into the site's public folder.
// Usage: pnpm render <slug>
// Needs the local Kokoro setup (see README.md) and the assets from tools/fetch-assets.mjs.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const videoDir = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: pnpm render <slug>");
  process.exit(1);
}
const siteDir = path.join(videoDir, "..", "public", "recipes", slug);
const outDir = path.join(videoDir, "out");
const bundle = path.join(mkdtempSync(path.join(tmpdir(), "recipe-video-")), "bundle");

function run(cmd, args) {
  const { status } = spawnSync(cmd, args, { cwd: videoDir, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
}
const remotion = (...args) => run("pnpm", ["exec", "remotion", ...args]);

// 1. Recipe data straight from the site's loader.
run("node", ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "export-recipe.mjs", slug]);
// 2. Narration, one clip per scene, with the timings the scenes follow.
run(path.join(".venv", "bin", "python"), ["narrate.py", slug]);
// 3. Both cuts, from one bundle. ANGLE is the GL backend that draws the 3D scenes.
mkdirSync(outDir, { recursive: true });
mkdirSync(siteDir, { recursive: true });
remotion("bundle", "src/index.ts", "--out-dir", bundle);
for (const id of [slug, `${slug}-vertical`]) {
  remotion("render", bundle, id, path.join(outDir, `${id}.mp4`), "--gl=angle", "--concurrency=5", "--crf=20");
}
// 4. The web copy: smaller, starting to play before it has fully loaded.
const master = path.join(outDir, `${slug}.mp4`);
remotion("ffmpeg", "-v", "error", "-y", "-i", master, "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "copy", path.join(siteDir, "how-to.mp4"));
// 5. The poster: the last frame of the opening scene, which shows the title with no
// caption. HowTo.tsx sizes that scene as 12 frames, the narration, then 30 frames.
const { durations } = JSON.parse(readFileSync(path.join(videoDir, "src", "data", `${slug}.narration.json`), "utf8"));
const posterFrame = 12 + Math.round(durations.hero * 30) + 30 - 1;
remotion("ffmpeg", "-v", "error", "-y", "-i", master, "-vf", `select=eq(n\\,${posterFrame})`, "-frames:v", "1", "-q:v", "3", path.join(siteDir, "how-to-poster.jpg"));
