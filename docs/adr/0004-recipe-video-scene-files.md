---
id: 0004
title: Recipe video scenes come from a per-recipe scene file that drives shared templates
status: accepted
date: 2026-11-03
supersedes: []
superseded_by: []
amends: []
amended_by: []
related: [0002, 0003]
---

# 0004: Recipe video scenes come from a per-recipe scene file that drives shared templates

## Context

The Smash Burger Bowl's how-to video (PR #5) was built from about 600 lines of scenes written for that one recipe (`PotatoScene.tsx`, `SauceScene.tsx`, `panScenes.tsx`), and `HowTo.tsx` named its scenes directly. `docs/recipe-playbook.md` found this to be the biggest cost that repeats per recipe. Liam approved turning the scenes into templates (playbook item B) on 2026-11-02.

## Decision

- Each recipe's video is described by `video/src/recipes/<slug>.scenes.json`, next to its narration script (`<slug>.narration.json`) and bowl build (`<slug>.build.json`). The file holds the title, the headline facts, and an ordered list of scenes. Scene ids match the narration script's keys, which supply the captions and the beats.
- A scene names one template and gives its data. The templates are the cooking methods the kit can show: `hero`, `pullApart`, `prep` (poke, microwave, cool, press, crisp), `mix` (ingredients into a small bowl with a growing list, then a stir), `skillet` (`saute`: into the pan, hands off, stir and brown; or `smash`: drop, parchment, press, crust, flip, cheese), `build`, and `finish`. How a template moves (camera paths, the press of a cup) stays in code; what the recipe says (which beat each step lands on, chip text and timers, list rows, colors, sounds) is data.
- Times are strings: `b3` (the frame narration beat 3 starts), `end` (the scene's last frame), a step the scene names (`crisp`), or a moment the template defines (`smash`), each with an optional `+N` or `-N` in frames. A bare number is a frame in the scene.
- `video/src/howto/scenes.ts` checks a scene file before anything renders and lists every problem at once: an unknown template, food, piece, or sound; a beat the narration does not have; a time that names nothing. It also lays out the video (every scene's start, length, fades, and narration window), so the render command reads the same plan the video draws.
- Remotion registers a wide and a vertical composition for every recipe that has a scene file, a narration script, and narration timings.

## Consequences

- A recipe whose methods the kit already has is new data only: a scene file, a narration script, and a bowl build. A new method is a new template, written once.
- The Smash Burger Bowl's scene file reproduces the hand-written video; stills at the key moment of every scene were compared by PSNR before the old scenes were deleted.
- Not yet per recipe: the bowl scenes (`hero`, `pullApart`, `build`, `finish`) draw the Smash Burger Bowl's build and bake. Validation refuses them for any other slug until the kit work (playbook item C) makes the bowl per recipe. Foods are limited to what the kit has (`potato`; `mushroom` and `onion` slices; beef), and validation names the gap.

## Alternatives

- Keep writing scenes in code per recipe: the cost this ADR removes.
- A general timeline language (keyframes per object): more flexible, but it moves choreography into data, and a recipe author would be animating, not describing.
- Pass the scene list as render input props: works for rendering, but the Remotion Studio would lose a composition per recipe, and the render command could not lay out the video without starting a browser.
