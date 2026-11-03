// Writes one recipe's data to src/data/<slug>.json for the video, using the
// site's own loader so the video always matches the published recipe.
// Usage: pnpm export <slug>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const videoDir = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
if (!slug) {
  console.error("Usage: pnpm export <slug>");
  process.exit(1);
}

// The loader reads content/recipes relative to the working directory.
process.chdir(path.join(videoDir, ".."));
const { getRecipe } = await import("../lib/recipes.ts");
const recipe = getRecipe(slug);
if (!recipe) {
  console.error(`No recipe with slug "${slug}" in content/recipes`);
  process.exit(1);
}

const out = path.join(videoDir, "src", "data", `${slug}.json`);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(recipe, null, 2));
console.log(`Wrote ${path.relative(videoDir, out)}`);
