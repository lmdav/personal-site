// Downloads the CC0 models and studio lighting listed in assets.json from Poly Haven
// into public/polyhaven/, keeping each glTF's relative texture paths, and the CC0
// sounds from Freesound into public/audio/.
// Usage: node tools/fetch-assets.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { models, textures = [], hdris, resolution, sounds = {} } = JSON.parse(readFileSync(path.join(root, "assets.json"), "utf8"));
const out = path.join(root, "public", "polyhaven");

async function save(url, file) {
  if (existsSync(file)) return;
  mkdirSync(path.dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${path.relative(root, file)}`);
}

for (const id of models) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  const gltf = files.gltf[resolution].gltf;
  await save(gltf.url, path.join(out, id, `${id}.gltf`));
  for (const [rel, f] of Object.entries(gltf.include ?? {})) await save(f.url, path.join(out, id, rel));
}
// Surface textures: color, OpenGL normal map, and roughness.
for (const id of textures) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  for (const map of ["Diffuse", "nor_gl", "Rough"]) {
    const { url } = files[map][resolution].jpg;
    await save(url, path.join(out, id, path.basename(url)));
  }
}
for (const id of hdris) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  await save(files.hdri[resolution].hdr.url, path.join(out, `${id}.hdr`));
}
for (const [key, sound] of Object.entries(sounds)) {
  if (typeof sound === "object") await save(sound.file, path.join(root, "public", "audio", `${key}.mp3`));
}
console.log("Assets ready in public/polyhaven/ and public/audio/");
