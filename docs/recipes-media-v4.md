# Recipe media v4: the 3D product shot

Status: direction chosen. The proof and both cuts of the narrated how-to video (16:9 and 9:16) are built and rendered on branch `feat/recipe-blueprint-video`, and are not yet wired into the recipe page. Last updated 2026-11-02. This supersedes the look and animation in `recipes-media-v3.md`. The recipe fields, the `video/` package, the render command, and the Kokoro narration pipeline all stay.

## Feedback on v3 (from Liam)

- The parts were not traced. They were drawn from scratch in code (ellipses, noise, hatching), so they look like a diagram, "the inside of a cell in a bio textbook", not real food.
- The animations feel rudimentary and do not flow together.
- He wants a product shot: everything pulls apart, then goes back together into one cohesive, good-looking finished bowl. It should be realistic, smooth, and professional.
- The process should be a system that can be repeated for any recipe.
- The narration says "romaine" like "ramen" and "patties" strangely.
- The video does not explain the sauce.

## What was tried

1. **2D photo cutouts (Direction A).** Rejected on 2026-11-02: flat cutouts do not sit in the bowl or flow together.
2. **Procedural 3D** (`video/src/proof/Bowl3D.tsx`). Too clean and diagram-like.
3. **Real 3D with real assets and physics (Direction B).** Chosen on 2026-11-02, when Liam asked for "real web elements and real web physics packs" at an A-tier bar.

## The chosen direction

Three.js inside Remotion (`@remotion/three`), at real-world scale in meters:

- **Studio:**
  - Real CC0 scans from Poly Haven: a cutting board and an onion.
  - The cream plaster surface from `beige_wall_001`.
  - The `studio_small_09` HDRI for soft white light and reflections, plus a warm key light from behind (food-photo backlight).
- **Lens:** N8AO ambient occlusion, depth of field that follows the camera target, a neutral tone curve, and a vignette (`@react-three/postprocessing`).
- **Bowl:** a wide speckled stoneware bowl turned on a lathe from a profile in the build spec. The physics bake collides with exactly the same shape.
- **Food from real photos:**
  - Smashed potatoes are traced from a photo. The outline comes from the cutout, the top domes up from the edge, light and dark become bumps, and the photo is the surface (`video/src/three/relief.ts`).
  - Patties use the same tracing on a lacy outline filled with a real seared-crust photo.
  - Romaine pieces are cut from a real leaf photo with torn-edge masks.
  - Tomato, onion, pickles, mushrooms, cheese, and caramelized onion are modeled and painted, since they are small on screen.
- **Physics (Rapier, baked):** `video/tools/bake-drop.mjs` runs in two passes.
  1. It drops every piece into the bowl in build order, which gives a natural resting arrangement.
  2. The pulled-apart pose is that arrangement lifted layer by layer, with big flat pieces leveled so they never show edge-on.
  3. It drops the layers back in and records every piece 60 times a second.

  The 30 fps video plays that recording in 2x slow motion. The bake retries until every piece stays in the bowl, and it fails loudly if one does not.
- **Choreography:**
  1. Hero bowl.
  2. Layers lift from the top down while the camera pulls back.
  3. Labels draw in with leader lines.
  4. Physics drop.
  5. The sauce drizzle draws on, raycast onto the real food surface.
  6. Title.

## The repeatable system

A new recipe needs:

1. **The recipe file** (already exists for every recipe).
2. **`video/src/recipes/<slug>.build.json`:** the layers in build order, with labels and amounts. Each ingredient has a kind, a count, and where it goes in the bowl (a zone, or exact spots).
3. **Ingredient kinds:** the kit in `video/src/three/ingredients.tsx` grows over time. A new kind needs a photo (traced with `relief.ts` when it is large on screen) or a painted material, plus a collider size in the build spec.
4. **Commands:**
   - `node tools/fetch-assets.mjs` downloads the CC0 assets listed in `assets.json`.
   - `.venv/bin/python tools/prepare_textures.py` cuts the photo textures.
   - `node tools/bake-drop.mjs <slug>` bakes the physics.
   - Remotion renders the result.

## The how-to video

Two compositions from the same scenes (`video/src/howto/`): `smash-burger-bowl-v4` (1920 x 1080, for the recipe page) and `smash-burger-bowl-v4-vertical` (1080 x 1920, for a phone). Both run about 114 seconds, narrated in the Kokoro `af_heart` voice with on-screen captions. It reuses the studio, the bowl, the ingredient kit, the physics bake, and the proof's choreography (now shared in `video/src/three/bowlShot.tsx`, which the proof also uses).

| Scene | What happens |
| --- | --- |
| 1. Hero | The finished bowl turns slowly beside the title. |
| 2. Pull-apart | The sauce and the layers lift away; each label draws in as the narration names it. |
| 3. Potatoes | A fork pokes three whole potatoes on a plate, the plate turns under a warm glow like a microwave turntable, the potatoes hop to the cutting board to cool and steam, a cup presses each one flat, and they crisp from pale to golden. |
| 4. Sauce | Each sauce ingredient drops into a small bowl on the line that names it, a list on the right adds its amount, and a spoon stirs it from white to pink. |
| 5. Mushrooms and onions | They fall into a dry skillet, sit, then get stirred and brown. |
| 6. Patties | The pan smokes, two beef balls go in, parchment on top, a spatula presses each flat, salt and pepper, two minutes for the crust, a flip, and the cheese melts. |
| 7. Build | The cold half drops into the bowl on its line, then the hot half on its line, with the baked physics in 2x slow motion. |
| 8. Finish | The sauce drizzles on, beans slide in beside the bowl, and the end card shows the facts and the URL. |

How it is put together:

- **Narration script:** `video/src/recipes/<slug>.narration.json`. Each scene is a list of beats, each with a line to speak and a caption. The recipe file is the source of truth for every amount, time, and temperature.
- **Narration audio:** `narrate.py` speaks each scene's beats into one WAV and writes the scene lengths and the time each beat starts to `video/src/data/<slug>.narration.json`.
  - Each scene lasts as long as its narration plus a little air, and never less than its action needs.
  - Captions switch beat by beat, and actions are timed to the beat that names them.
- **Pronunciation:** `narrate.py` has a dictionary of phoneme overrides: "romaine" as roh-MAYN, "patties" as PAT-eez, and "paprika" as puh-PREE-kuh. It fails loudly if it cannot find a word it should fix. Checked with whisper.cpp: the old voice's "romaine" transcribes as "ramen", the fixed one as "romaine", and every line of the final script transcribes correctly.
- **New building blocks:**
  - `video/src/three/cookware.tsx`: a lathe-turned cast iron skillet, press cup, spatula, spoon, parchment, and small bowls.
  - `video/src/three/cooking.tsx`: a shader that takes any material from raw to done, raw potatoes and beef, dollops, melting cheese, beans, and steam.
- **Draft mode:** pass `--props='{"draft":true}'` for half resolution with no lens effects (also on `proof-bowl-real`).
- **For an older viewer (Liam's request):** captions are 58 px (64 px in the vertical cut), near-black on an opaque cream card. The voice runs at 0.9x speed. There is a 0.45 s pause between beats and a 1 s hold after each scene's narration.
- **The vertical cut** has its own framing:
  - A wider lens (46° instead of 28°).
  - The title sits on top, with the bowl below it.
  - The potato set and the skillet turn a quarter turn, so the board and the pan's handle run up the frame.
  - The sauce bowl sits above its ingredient list.
  - The captions sit higher, clear of a phone's controls.
  - The bowl scenes leave out the background board and onion.
- **Sound** (`video/src/howto/sound.tsx`):
  - A soft music bed that drops under the voice and crossfades into itself to cover the full length.
  - Quiet cooking sounds only where something real makes a sound: the patties' sizzle (swelling at the smash and the flip), the mushrooms' pan, the potatoes crisping, a soft plop as each sauce ingredient lands, and the spoon stirring.
  - All six files are CC0 from Freesound. `assets.json` lists them and `tools/fetch-assets.mjs` downloads them into `video/public/audio/`.
  - Pass `--props='{"sound":false}'` to render without them.
  - Levels were set from measurements taken on 2026-11-02 with ffmpeg's EBU R128 meter:

    | Track | Measured | In the mix |
    | --- | --- | --- |
    | Narration | -22.4 LUFS | as is |
    | Music | -16.3 LUFS | about -32 between lines, -40 under the voice |
    | Patty sizzle | -23.3 LUFS | about -40, a little louder at the smash and the flip |
    | Mushroom pan | -16.2 LUFS | about -36 |
    | Crackle | -54 dB between pops | raised about 7 dB, since it is a quiet recording |
    | Plops | -13 to -24 dB peak | each about -27 dB peak |
    | Stir | -39.2 LUFS | about the same |

  - The plop file holds several separate plops, so each sauce ingredient gets its own. The crackle uses a stretch (4 to 10 s) with no loud pops.
  - Pass `--codec=wav` to render the mix alone. It still draws every frame, so it takes about as long as a full render.
- **Credits:** `video/CREDITS.md` lists every outside model, texture, photo, sound, font, voice, and library, with its source and license.
- **Frame check:** `video/tools/check_frames.py <mp4> --fades <ranges>` flags blank frames and one-frame glitches. A planted blank frame is caught.

## Render speed

Measured on 2026-11-02 rendering frames 200 to 229 of `proof-bowl-real` with `--gl=angle --concurrency=3`. Each run includes about 3 seconds of browser startup (a 1-frame render takes 3.1 seconds).

| Settings | 30 frames |
| --- | --- |
| Before: N8AO quality "high", 4096 shadow map, multisampling 4 | 112.8 s |
| After: N8AO quality "medium", 2048 shadow map, multisampling 2, depth of field at half resolution | 17.8 s |
| Draft (half resolution, no lens) | 18.2 s |

- Frames from before and after look the same: frame 205 and a hero close-up were compared side by side.
- Almost all of the gain came from N8AO: "high" takes 64 samples per pixel, "medium" takes 16.
- With the lens this fast, draft mode no longer saves much time.
- N8AO's half-resolution mode crashes on three r187 (n8ao 2.0.1 gives three an array where it expects a texture), so it stays off.
- Depth of field was already at half resolution by default; the setting is now explicit.

How to render:

```bash
npx remotion bundle src/index.ts --out-dir <scratch>/bundle
npx remotion render <scratch>/bundle smash-burger-bowl-v4 out/smash-burger-bowl-v4.mp4 --gl=angle --concurrency=5 --crf=20
```

## Review gates (Liam, 2026-11-02)

1. The narration audio goes to Liam before the final render. It was sent on 2026-11-02 as `video/out/narration-review.mp3`, and Liam approved it the same day.
2. The six sounds are downloaded only after Liam approves them. He approved them the same day, alongside the narration.

## Code review (2026-11-02)

One independent correctness pass covered the new code. Its eight findings were each checked against the code and fixed before the final render:

- salt and pepper drawn inside the patty
- the fork jumping sideways between pokes
- the stirred sauce popping in as a ring
- drops appearing mid-air inside the frame
- a caption dip on every beat change
- a turn mismatch when the potato swaps to its pressed piece
- `narrate.py` able to leave new audio next to old timings after a failure
- label lines rebuilt every frame

## Known limits

- The mix was checked by measurement (loudness per scene, voice against music and effects, peaks), not by ear.

- Up close, the photo-traced potatoes show stretched side walls and dark fringes from the source photo. The potato scene looks down more steeply while they crisp to hide this.
- Raw patties use the cooked patty's lacy outline with a raw tint, so their edges look shaggy.
- The flip has no spatula. The cheese melts without a lid.
- The oil is in the narration and captions but not shown. A translucent film read as murky liquid, so it was removed.

## Wiring it in (not done; needs Liam's OK)

- The old v3 composition (`smash-burger-bowl`, `video/src/Video.tsx`) is no longer registered, because its narration script was replaced. Its rendered video in the site's `public/recipes/smash-burger-bowl/` is untouched, and the recipe page on this branch still points at it.
- `video/render.mjs` renders the composition named after the slug, so it fails until the v4 composition takes over that id.
- To wire it in: rename the composition to the slug, add `--gl=angle` to `render.mjs`, render into `public/recipes/<slug>/how-to.mp4`, and pick a new poster frame.

## Status

| Piece | Status (last checked 2026-11-02) |
| --- | --- |
| Asset fetcher and manifest (`assets.json`, `tools/fetch-assets.mjs`) | Built |
| Photo texture prep (`tools/prepare_textures.py`) | Built. The source photos live outside the repo; their Unsplash pages and IDs are in `video/CREDITS.md`. |
| Photo relief tracing (`video/src/three/relief.ts`) | Built |
| Ingredient kit, stoneware bowl, studio and lens | Built |
| Two-pass physics bake with retries | Built |
| 15-second proof composition `proof-bowl-real` | Built; now uses the shared `bowlShot.tsx` and renders the same as before |
| Faster renders and a draft mode (lens settings in `Studio.tsx`) | Built; 30 frames went from 112.8 s to 17.8 s |
| Pronunciation dictionary ("romaine", "patties", "paprika") | Built; checked with whisper.cpp |
| Beat-timed narration and captions (`narrate.py`, narration script) | Built |
| Sauce scene naming each sauce ingredient | Built |
| Full narrated video `smash-burger-bowl-v4` (16:9) | Rendered to `video/out/smash-burger-bowl-v4.mp4`: 3,407 frames, 113.6 s, in 9.7 min at concurrency 5. The frame check found no blank or glitch frames. Sent to Liam. |
| Vertical cut `smash-burger-bowl-v4-vertical` (9:16) | Rendered to `video/out/smash-burger-bowl-v4-vertical.mp4`: 3,407 frames in 9.7 min. The frame check found no blank or glitch frames. Sent to Liam. |
| Slower narration, longer holds, bigger captions | Built |
| Potato pre-cook (fork, microwave, cool) | Built |
| Music bed and cooking sounds | Built. The six CC0 files were downloaded with Liam's OK. In the final mix, the music and effects sit 11 to 20 dB under the voice, scene by scene, with a peak of -3.5 dBFS. This is measured, not listened to. |
| Credits file `video/CREDITS.md` | Built. Every photo, model, texture, sound, font, voice, and library is credited. |
| Wiring the video into the recipe page | Planned; waiting for Liam's OK |
| Asset credits on the recipe page | Planned (the list is in `video/CREDITS.md`) |
