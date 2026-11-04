---
id: 0005
title: Each recipe's bowl comes from its own build file and bake
status: accepted
date: 2026-11-03
supersedes: []
superseded_by: []
amends: [0004]
amended_by: []
related: []
---

# 0005: Each recipe's bowl comes from its own build file and bake

## Context

ADR 0004 left the bowl templates (`hero`, `pullApart`, `build`, `finish`) drawing only the Smash Burger Bowl, and the scene check refused them for any other recipe. Beef Broccoli Bowls was the first recipe to need another bowl, plus foods and cooking methods the kit lacked. Liam approved that work on 2026-11-03, for this recipe only (part of playbook item C).

## Decision

- `video/src/three/bowlShot.tsx` reads every recipe's `<slug>.build.json` and `<slug>.drop.json` through `bowlOf(slug)`. Nothing else names a recipe, apart from the old proof composition.
- The scene check takes the recipe's own bowl, or null if it has none baked, and refuses bowl templates only in that case.
- The build scene's `waves` map each step to the layers it drops, so a recipe chooses how many drops it has. The Smash Burger Bowl keeps `cold` and `hot`.
- The build file holds the drizzle's color and path and an optional topping.
- A kind with a `lathe` profile is one fixed mass the other pieces land on, because a bed of rice is too many grains to simulate. A kind marked `flat` can only turn around the vertical, so an egg cannot land yolk down. A piece group can set a fixed `yaw`.
- `pnpm render` bakes the bowl before planning, so a new checkout needs no separate bake step.
- New templates and cooks: `pot`, `board`, and skillet `sear`, `char`, and `eggs`. New foods are in `video/src/three/foods.ts`, built only when something asks for them.

## Consequences

- A rice bowl built from these foods and methods is now data only.
- The Smash Burger Bowl is unchanged: its bake is byte-identical, and 44 stills at 22 moments, wide and vertical, show zero pixel difference from `main`. A second render of `main` also showed zero, so that comparison has no noise floor to hide behind.
- The bake is chaotic: changing one piece moves others. Placements are chosen by scoring bakes and then looking at a still.
- The bowl's `video/src/data` import no longer blocks the type check on a fresh worktree, since it is found at bundle time.

## Alternatives

- Hand-written scenes for this recipe: the cost ADR 0004 removed.
- Simulating every grain of rice: thousands of bodies, for a surface that only needs to look like rice and hold the food up.
- Photo-traced steak, broccoli, and avocado: skipped because the modeled versions passed review without downloading anything. The steak's crust reuses the existing photo.
