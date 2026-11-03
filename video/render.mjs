// Renders a recipe's narrated how-to video, its poster, and its blueprint sheet
// into the site's public folder. Usage: pnpm render <slug>
// Needs the local Kokoro setup (see README.md) for the narration.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const videoDir = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: pnpm render <slug>");
  process.exit(1);
}
const siteDir = path.join(videoDir, "..", "public", "recipes", slug);

function run(cmd, args) {
  const { status } = spawnSync(cmd, args, { cwd: videoDir, stdio: "inherit" });
  if (status !== 0) process.exit(status ?? 1);
}

// 1. Recipe data straight from the site's loader.
run("node", ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "export-recipe.mjs", slug]);
// 2. Narration, one clip per scene, with durations the scenes are timed to.
run(path.join(".venv", "bin", "python"), ["narrate.py", slug]);
// 3. The video, a poster frame, and the blueprint sheet.
run("pnpm", ["exec", "remotion", "render", "src/index.ts", slug, path.join(siteDir, "how-to.mp4"), "--codec=h264", "--crf=26"]);
run("pnpm", ["exec", "remotion", "still", "src/index.ts", slug, path.join(siteDir, "how-to-poster.jpg"), "--frame=140", "--image-format=jpeg", "--jpeg-quality=88"]);
run("pnpm", ["exec", "remotion", "still", "src/index.ts", `${slug}-blueprint`, path.join(siteDir, "blueprint.png")]);
