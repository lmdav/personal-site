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

This runs four steps:

1. Exports the recipe from `content/recipes/<slug>.md` through the site's own loader into `src/data/<slug>.json`, so titles, times, and nutrition always match the page.
2. Reads the narration script in `src/recipes/<slug>.narration.json` aloud in the Heart voice, writing one clip per scene and recording their lengths. Each scene lasts as long as its narration.
3. Renders `public/recipes/<slug>/how-to.mp4` (1080p, H.264) and `how-to-poster.jpg`.
4. Renders `public/recipes/<slug>/blueprint.png` (3200 x 2200) from the same drawings.

To preview while editing, run `pnpm export <slug>` and `.venv/bin/python narrate.py <slug>` once, then `pnpm studio`. The `parts-sheet` still shows every drawing in its states.

## How it fits together

- `src/parts.tsx`: every ingredient and tool as a 3D drawing with state props, such as a patty's `smash` and `crust`, the cheese's `melt`, and a potato's `flatten` and `crisp`. The video animates these props, and the sheet draws them at rest.
- `src/Video.tsx`: the eight narrated scenes. Each scene animates the action its narration describes.
- `src/Sheet.tsx`: the blueprint sheet.
- `narrate.py`: the Kokoro narration.

## Add a recipe

1. Write `src/recipes/<slug>.narration.json` with the same eight scenes. Each scene is a list of beats, and each beat has a line to speak and a caption.
2. Add its parts and scene details. New ingredients become new parts in `src/parts.tsx`.
3. Register a `<Composition>` with the slug as its id and a `<Still>` with id `<slug>-blueprint` in `src/Root.tsx`.
4. Run `pnpm render <slug>`, then add the `blueprint` and `video` fields to the recipe file.

## License

Remotion is free for individuals and companies of up to three people. Kokoro is Apache 2.0.
