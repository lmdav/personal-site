---
id: 0003
title: Recipe videos are narrated locally with Kokoro and drawn from shared animated parts
status: accepted
date: 2026-11-02
supersedes: []
superseded_by: []
amends: [0002]
amended_by: []
related: [0001]
---

# 0003: Recipe videos are narrated locally with Kokoro and drawn from shared animated parts

## Context

The first video (ADR 0002) zoomed around a still blueprint image and explained little. Liam asked for crisp animation in which every element makes sense, ingredients that look like what they are, and narration from a free voice. The blueprint sheet and the video should look like one system.

## Decision

- Every ingredient and tool is a React SVG component in `video/src/parts.tsx`, drawn in one 3D style on cream drafting paper. State props (smash, crust, melt, flatten, crisp, brown) let the video animate it. The blueprint sheet is a Remotion still drawn from the same parts, so both always match.
- Narration comes from Kokoro-82M (Apache 2.0) running locally through `kokoro-onnx`, in the `af_heart` voice. `video/narrate.py` writes one clip per scene and records its length, and each scene lasts as long as its clip.
- `pnpm render <slug>` runs the whole pipeline: export the recipe, narrate, render the video and poster, and render the sheet.

## Consequences

- Rendering needs the local Python environment and model files (about 115 MB), set up once per machine as `video/README.md` describes.
- Everything is vector until the final encode, so frames stay sharp at any size.
- A new recipe needs a narration script and, for new ingredients, new parts. That is real drawing work, but each part is then reusable.
- No paid service and no network calls at render time, except Google Fonts.

## Alternatives

- **macOS built-in voices:** no download, but the voices installed now sound robotic.
- **Piper:** smaller and fast, but less natural than Kokoro.
- **Clip art from free asset libraries:** the mixed styles would clash. Parts are traced from reference shapes instead.
- **AI-generated footage:** costs money, gets food and hands wrong, and would not show the real dish.
