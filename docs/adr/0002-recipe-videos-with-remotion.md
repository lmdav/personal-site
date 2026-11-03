---
id: 0002
title: Recipe how-to videos are rendered with Remotion in a separate package
status: accepted
date: 2026-11-02
supersedes: []
superseded_by: []
amends: []
amended_by: []
related: [0001]
---

# 0002: Recipe how-to videos are rendered with Remotion in a separate package

## Context

Each recipe page can show a short how-to video and a blueprint drawing. There are no photos or footage yet, so the video has to be built from the recipe itself: its steps, times, and drawing. It must stay in sync with the recipe file, cost nothing to run, and not slow down or enlarge the website's build.

## Decision

Videos are made with Remotion, a React library that renders video from code, in `video/`. That folder is its own package with its own lockfile, and it is excluded from the site's TypeScript, lint, and Vercel uploads. `video/render.mjs` exports the recipe through the site's own loader (`lib/recipes.ts`), so the video reads the same validated data as the page. It renders an H.264 MP4 and a poster into `public/recipes/<slug>/`, which are committed and served as static files. Short on-screen lines per step live in `video/src/recipes/<slug>.ts`, because the recipe text is too long to read on screen.

## Consequences

- Rendering happens on a laptop, not in CI or on Vercel. A changed recipe needs `pnpm render <slug>` to update its video.
- Videos are committed to git, at about 5 MB each. Dozens of recipes would call for moving them to Blob storage.
- Remotion is free for individuals and companies of up to three people. The site is personal, so no license is needed.
- The on-screen step lines can drift from the recipe if the steps change. The exported data keeps titles, times, and ingredients in sync. Only the short lines need a manual check.

## Alternatives

- **AI-generated cooking footage:** costs credits, often gets hands and food wrong, and would not show the real dish.
- **A video editor by hand:** every recipe change means re-editing by hand. Nothing keeps it in sync.
- **Animating on the page with CSS or JavaScript:** it cannot be downloaded or texted to someone, and it costs page performance.
