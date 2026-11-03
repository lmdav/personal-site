# Recipe media v3: spec

Status: approved direction, not built yet. Last updated 2026-11-02.

This is the source of truth for the next version of the recipe blueprint drawings and how-to videos. It replaces the v2 work in PR #5 (`feat/recipe-blueprint-video`). The recipe format fields, the Remotion package in `video/`, the render pipeline, and ADR 0002 from v2 all stay. The drawings and the video scenes get rebuilt.

## Feedback on v2 (from Liam)

- Too "blueprinty". The parts look unimaginative and do not accurately show what they are.
- The video mostly zooms into a still image. Its animations do not explain anything.
- The animation should be crisp, and everything in it should make sense.
- He wants narration with a free voice.
- Remove the "Taste test: Grandma, pending" joke everywhere.

## Decisions

| Topic | Decision |
| --- | --- |
| Look | Cream drafting paper (`#F3ECDD`), navy ink (`#1D3557`), light blue shading for volume (`#DDE7F1` top faces, `#B7C8DC` sides), and coral (`#D4553A`) handwritten notes in Caveat. Type is IBM Plex Mono for labels and Instrument Serif for titles. |
| Parts | Every ingredient is redrawn as a 3D isometric object in one consistent style, like the approved style test (`scripts/blueprints/style-test-parts.py`). Shapes are traced from free reference photos (Unsplash, which allows modification) so they are accurate. Do not mix in clip art from asset libraries, because the styles would clash. |
| Voice | Kokoro-82M via `kokoro-onnx`, running locally, free (Apache 2.0). Liam approved the one-time download (about 115 MB from github.com/thewh1teagle/kokoro-onnx releases: the int8 model and `voices-v1.0.bin`). Make 2 to 3 voice samples for Liam to choose from before rendering the full video. |
| Video | Real animation, all vector so it stays crisp at 1080p. No zooming into raster images. Each scene shows the action it describes, narrated, with captions on screen. |

## Parts to redraw (Smash Burger Bowl)

Bowl (wide, ceramic, with rim thickness), chopped romaine, diced tomato (with seed pockets), diced raw onion, crinkle-cut dill pickle chips (seed ring), smashed potatoes (craggy, cracked, crisp rim), two smash patties (lacy edge with fried-through holes, seared crust), American cheese half slice (melting and draping), cremini mushroom slices (cap, gills, stem, standing with depth), sliced onion, the yogurt special sauce (glossy drizzle), and smoky pinto beans in a ramekin.

## Video storyboard (narrated, roughly 60 to 75 seconds)

1. **Title.** The recipe name and key facts, drawn on.
2. **Ingredients.** Each part pops into a neat "kit" layout with its label, grouped like the recipe.
3. **Potatoes.** Fork pokes, microwave timer, rest, then a cup presses each potato flat. Oil drizzles on, air-fryer heat waves appear, and the rims crisp up.
4. **Sauce and beans.** Ingredients drop into a cup and stir. Beans simmer, with bubbles and the sauce thickening.
5. **Mushrooms and onions.** They hit a dry pan, brown, then get a splash of Worcestershire.
6. **Smash.** A ball drops into a smoking-hot pan (heat shimmer). Parchment goes on, the spatula presses the ball into a lacy patty, and a crust grows in from the edge during a 2-minute countdown. Flip, the cheese drapes and melts, then the lid goes on with steam.
7. **Build.** Cold parts fly into one half of the bowl and hot parts into the other, then the sauce drizzle draws across.
8. **Finish.** The finished bowl, the honest nutrition, and `lmdav.com/recipes`. No "Grandma pending".

Scene lengths follow the narration: generate the audio first, measure each clip, then time each scene to its clip.

## Build order

1. Voice samples, then Liam picks a voice.
2. Redraw the parts library and render a parts sheet for review.
3. Redraw the blueprint sheet in cream with the new parts (no Grandma line), and review it.
4. Storyboard frames for each scene, and review them.
5. Full narrated render, then the page update, `pnpm verify`, and a PR. Ask Liam before merging or deploying (a manual Vercel deploy, see `content/recipes/README.md` and the PR #3 notes).

## Constraints

- No em dashes anywhere. `tests/copy-rules.test.ts` scans `video/src` too.
- The video stays a separate package in `video/`. It is excluded from the site's TypeScript, lint, and Vercel upload.
- The printed recipe is unchanged: video and blueprint stay screen-only.
