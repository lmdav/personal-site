// Renders chosen frames of a composition from a bundle, as PNGs, with one shared browser.
// Used to prove a refactor draws the same picture: render the same frames from a bundle
// made before the change and one made after, then compare them with tools/psnr.mjs.
// Usage: node tools/stills.mjs <bundle-dir> <composition> <out-dir> <frame> [frame ...]
import { mkdirSync } from "node:fs";
import path from "node:path";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";

const [bundle, id, outDir, ...frames] = process.argv.slice(2);
if (!bundle || !id || !outDir || frames.length === 0) {
  console.error("Usage: node tools/stills.mjs <bundle-dir> <composition> <out-dir> <frame> [frame ...]");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
// ANGLE is the GL backend that draws the 3D scenes; without it the render stalls.
const chromiumOptions = { gl: "angle" };
const browser = await openBrowser("chrome", { chromiumOptions });
try {
  const composition = await selectComposition({ serveUrl: bundle, id, puppeteerInstance: browser, chromiumOptions });
  for (const frame of frames.map(Number)) {
    const output = path.join(outDir, `${id}-${String(frame).padStart(5, "0")}.png`);
    await renderStill({ serveUrl: bundle, composition, frame, output, imageFormat: "png", puppeteerInstance: browser, chromiumOptions, overwrite: true });
    console.log(output);
  }
} finally {
  await browser.close({ silent: true });
}
