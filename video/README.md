# Recipe videos

Short how-to videos for the recipes, made with [Remotion](https://www.remotion.dev). This folder is its own package so the website does not install or build any of it.

## Make or update a video

```bash
pnpm install --ignore-workspace
pnpm render smash-burger-bowl
```

`pnpm render <slug>`:

1. exports the recipe from `content/recipes/<slug>.md` through the site's own loader into `src/data/<slug>.json`, so the video always matches the published recipe;
2. copies `public/recipes/<slug>/blueprint.png` into `video/public/`;
3. renders `public/recipes/<slug>/how-to.mp4` (1080p, H.264) and a poster frame, `how-to-poster.jpg`.

To preview while editing, run `pnpm export <slug>` once, then `pnpm studio`.

## Add a recipe

1. Make the recipe's blueprint first (see `content/recipes/README.md`).
2. Copy `src/recipes/smash-burger-bowl.ts` to `src/recipes/<slug>.ts`. Write one short on-screen line per step, and set the blueprint regions to zoom to.
3. Add a `<Composition>` for it in `src/Root.tsx`, with its id set to the slug.
4. Run `pnpm render <slug>`, then add the `video` field to the recipe file.

## License

Remotion is free for individuals and companies of up to three people. A larger company needs a Remotion company license.
