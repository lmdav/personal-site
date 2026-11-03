// Renders a recipe's how-to video and poster into the site's public folder.
// Usage: pnpm render <slug>
// Needs public/recipes/<slug>/blueprint.png and src/recipes/<slug>.ts first.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
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

// 2. The blueprint drawing, served to Remotion from video/public.
mkdirSync(path.join(videoDir, "public", slug), { recursive: true });
copyFileSync(path.join(siteDir, "blueprint.png"), path.join(videoDir, "public", slug, "blueprint.png"));

// 3. The video (H.264, sized for the web) and a poster frame.
run("pnpm", ["exec", "remotion", "render", "src/index.ts", slug, path.join(siteDir, "how-to.mp4"), "--codec=h264", "--crf=28"]);
run("pnpm", ["exec", "remotion", "still", "src/index.ts", slug, path.join(siteDir, "how-to-poster.jpg"), "--frame=70", "--image-format=jpeg", "--jpeg-quality=85"]);
