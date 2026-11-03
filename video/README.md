# Recipe videos and blueprint sheets

Narrated how-to videos and blueprint drawing sheets for the recipes, made with [Remotion](https://www.remotion.dev) and a free local voice ([Kokoro](https://github.com/thewh1teagle/kokoro-onnx)). This folder is its own package so the website does not install or build any of it. The current design, the v4 3D product shot, is described in `docs/recipes-media-v4.md`.

## One-time setup

```bash
pnpm install --ignore-workspace
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python kokoro-onnx soundfile
mkdir -p models && cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

The model files (about 115 MB) and `.venv` stay on your machine. Git ignores them.

## Make or update a recipe's video and sheet

```bash
pnpm render smash-burger-bowl
```

This runs every step in one go, and stops with a non-zero exit if a step or check fails:

1. Exports the recipe from `content/recipes/<slug>.md` through the site's own loader into `src/data/<slug>.json`, so titles, times, and nutrition always match the page.
2. Reads the narration script in `src/recipes/<slug>.narration.json` aloud in the Heart voice. It writes one clip per scene and records how long each scene and beat runs.
3. Transcribes every spoken line with whisper.cpp (`tools/check-narration.mjs`) and stops if one does not match the script, such as "romaine" heard as "ramen". Needs `whisper-cli` (`brew install whisper-cpp`) and the `ggml-base.en.bin` model in `models/`, `~/.cache/whisper-cpp/`, or `WHISPER_MODEL`.
4. Checks the scene file and lays out the video from it.
5. Bundles once, then renders the wide cut (composition `<slug>`) and the vertical cut (`<slug>-vertical`) into `out/`, with the ANGLE GL backend at concurrency 5. A render that makes no progress for 2 minutes (10 while it mixes the audio after the last frame), or runs past an hour, is stopped; every other step has a time limit too.
6. Checks both cuts for blank or glitched frames outside the fades (`tools/check_frames.py`), and checks the mix's loudness (`tools/loudness.mjs`).
7. Only if both cuts pass: writes a smaller web copy of the wide cut to `public/recipes/<slug>/how-to.mp4`, and `how-to-poster.jpg` beside it. A failed check leaves the site's copies as they were.

It needs `ffmpeg` and `ffprobe` on the path (`brew install ffmpeg`) for the checks. Run `node tools/fetch-assets.mjs` once first, to download the 3D assets and sounds.

To preview while editing, run `pnpm export <slug>` and `.venv/bin/python narrate.py <slug>` once, then `pnpm studio`. The `parts-sheet` still shows every drawing in its states.

## How it fits together

- `src/recipes/<slug>.scenes.json`: the recipe's video as data. Each scene names a template and gives it the recipe's steps, timer chips, list rows, and sounds. The format is in `docs/adr/0004-recipe-video-scene-files.md`.
- `src/howto/scenes.ts`: checks a scene file, turns its times into frames, and lays out the video. The render command reads the same plan.
- `src/howto/`: the templates. `bowlScenes.tsx` (hero, pull-apart, build, finish), `PrepScene.tsx` (poke, microwave, cool, press, crisp), `MixScene.tsx` (ingredients into a small bowl, then a stir), and `skilletScenes.tsx` (saute, or smash and flip). `HowTo.tsx` plays the scene list; `recipes.ts` finds every recipe's files.
- `src/three/`: the studio, the bowl, the ingredient kit, cookware, and cooking effects.
- `narrate.py`: the Kokoro narration.

## Add a recipe

1. Write `src/recipes/<slug>.narration.json`: each scene is a list of beats, and each beat has a line to speak and a caption.
2. Write `src/recipes/<slug>.scenes.json` with the same scene ids, a template for each, and the times its steps land on, like `"crisp": "b4"` for the fifth beat. The Smash Burger Bowl's file is the worked example. A check lists every problem when the video bundles.
3. A cooking method the templates do not cover, or a food the kit does not have, needs a new template or kit piece first. The bowl templates still draw the Smash Burger Bowl's bowl (playbook item C).
4. Run `pnpm render <slug>`, then add the `video` field to the recipe file.

## License

Remotion is free for individuals and companies of up to three people. Kokoro is Apache 2.0.
