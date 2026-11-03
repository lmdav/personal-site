# Recipe playbook: from a tested recipe to a live page with a video

Written 2026-11-02, after the first full run (the Smash Burger Bowl). This is the source of truth for how a recipe goes from Liam's notes to lmdav.com with a narrated how-to video, and for how the next run gets faster. The video's look and system are specified in `docs/recipes-media-v4.md`. The recipe file format is in `content/recipes/README.md`.

## The short version

- The first run took about 5 hours 20 minutes on the clock (18:11 to about 23:35), across four sessions.
- About three and a half hours of that built things that never have to be built again: the recipes section, cook mode, the look of the video (five directions tried before one stuck), the 3D studio, the physics, and the narration and sound systems.
- What repeats for every recipe is small: review and write the recipe, write the video's data files, render, and publish.
- Target for the next recipe: about 10 to 15 minutes of Liam's attention at three touchpoints, and about 40 minutes on the clock, most of it a render running in the background. This holds when the recipe uses cooking methods the video kit already has. A new method (a pot for chili, a griddle for pancakes) adds roughly 30 to 60 minutes the first time, and is reusable after that.
- These targets are estimates from today's timings. The next run is the test.

## What shipped on 2026-11-02

- **The recipes section on lmdav.com:** a Markdown recipe format with a validator that fails the build on a bad file, a `pnpm verify` gate, the index and recipe pages, print styles, recipe structured data, and cook mode with a phone ingredients panel (PRs #2, #3, and #6).
- **The Smash Burger Bowl:** revised after a chef's review (PR #4), with oven timing (PR #7) and a sweet potato, oven-only version (PR #8).
- **The v4 video system in `video/`:** a cream 3D studio with CC0 assets, ingredients traced from real photos, a stoneware bowl, a Rapier physics bake, Kokoro narration with a pronunciation dictionary, beat-timed captions, a music bed with cooking sounds, a frame checker, and a credits file.
- **The narrated how-to video** in a 16:9 cut for the page and a 9:16 cut for a phone, 113.6 seconds each (PR #5). As of 23:35 the video session is wiring it into the page and turning the sweet potato version into a choice on the same page.

## How the day went

Times come from the four session transcripts. Sessions ran in parallel, so some phases overlap, and Liam's review time is included.

| Phase | Clock | About | Repeats per recipe? |
| --- | --- | --- | --- |
| 1. Find the site and build the recipes section: format, validator, tests, verify gate, pages, print styles, first publish | 18:11 to 19:05 | 55 min | No |
| 2. Chef review, revised recipe, publish | 19:07 to 19:17 | 10 min | Yes |
| 3. Cook mode and phone readability (its own session) | 19:44 to 20:05 | 20 min | No |
| 4. Tonight's kitchen: oven timing, then a sweet potato version | 20:05 to 20:16 | 11 min | Avoidable with kickoff questions |
| 5. Finding the video's look: blueprint drawings, a cream blueprint video, the voice pick, the v4 proposal, 2D photo cutouts, procedural 3D | 18:28 to 20:33, with gaps | 1 h 30 min | No. The look is now locked. |
| 6. The real 3D proof: CC0 assets, photo tracing, ingredient kit, physics bake, lens, and a 16.5 min render | 20:25 to 21:15 | 50 min | Only for new ingredients |
| 7. The full narrated video: eight scenes, pronunciation fixes, the vertical cut, captions sized for an older viewer, sound (its own session) | 21:22 to 22:13 | 50 min | The recipe-specific scenes repeat |
| 8. Renders, including a stalled audio render | 22:13 to 22:59 | 46 min | The render repeats (about 20 min). The stall should not. |
| 9. Liam's review, commit, wire into the page, deploy | 22:59 to after 23:35 | 35 min or more | Yes. It should take about 3 minutes. |

The recipe itself was drafted before this run, in a claude.ai chat, and handed over as a Claude Doc ("Recipes Page: Claude Code Handoff").

## What cost the time, and the fix for each

1. **The look was discovered by building it.** Five directions were built at full fidelity before one stuck: blueprint drawings, a cream blueprint video, 2D photo cutouts, procedural 3D, and real 3D. Each rejection came after a render. *Fix:* the v4 look is now the house style. Anything new gets a style-frame gate first: one still per direction, approved before any animation is written.
2. **The quality bar arrived in stages.** "A recipe page with images" became a blueprint, then "realistic product shot, A tier, real assets and physics", then "for grandma on a phone: bigger captions, slower voice, a vertical cut". Each stage reworked the one before. *Fix:* the house defaults below record the whole bar, so the next run starts there.
3. **The cooking scenes were written by hand for this recipe.** The potato, sauce, and skillet scenes are about 600 lines (`video/src/howto/PotatoScene.tsx`, `SauceScene.tsx`, `panScenes.tsx`), and `HowTo.tsx` names this recipe's scenes directly. *Fix:* scene templates driven by a per-recipe scene file (proposal item B).
4. **Kitchen facts arrived after publishing.** No air fryer tonight, and big sweet potatoes instead of Yukon Golds, each became its own follow-up PR and deploy. *Fix:* kickoff questions, asked once before anything is written.
5. **Renders were slow, and one stalled.** The 15-second proof took 16.5 minutes before the lens settings were tuned (30 frames went from 112.8 s to 17.8 s). Later, an audio-only render ran without `--gl=angle`, sat idle for 10 minutes, and the retry took another 10, because an audio-only render still draws every frame. *Fix:* one render command with the flag built in, a stall timeout, and the mix measured from the final render's own audio.
6. **Deploys are manual.** The Vercel project's Git link points at a deleted repo (`personal-site1`), so merging does not deploy, and every publish needs `vercel deploy --prod` by hand. *Fix:* relink the project to `lmdav/personal-site` (item F).
7. **One long session carried too much.** The main session compacted twice, and each summary drops detail. *Fix:* one session per stage, with this playbook and the v4 spec as the hand-off between them.
8. **Approvals came one at a time:** the voice, the format, the sounds, the narration. Each one paused the work. *Fix:* the house defaults, plus one review pack per run.

## The next recipe, step by step

This is the target pipeline. The `/recipe` skill (`~/.claude/skills/recipe/SKILL.md`, item A) runs it, and items B, D, and E, which stages 2 and 3 depend on, were built on 2026-11-03 (see Status). They take effect once their PRs merge.

| Stage | What happens | Liam's time | Clock |
| --- | --- | --- | --- |
| 0. Kickoff | Liam sends the recipe (text, link, or Claude Doc) and answers the kickoff questions in one reply. | 2 min | 2 min |
| 1. Recipe | Chef review against the checklist, write `content/recipes/<slug>.md`, `pnpm verify`, PR. Liam says "publish" once; it merges and deploys. The recipe is live and cookable before any video work starts. | 2 min | 8 min |
| 2. Video plan | From the recipe file, write the build spec, scene file, and narration script. Check that the kit covers every ingredient and cooking method. Narrate with Kokoro and check every line with whisper. Render one still per scene. Liam gets one review pack: the narration MP3 and the stills. | 3 min | 8 min, plus 30 to 60 min for a new cooking method |
| 3. Render | One command renders both cuts and the poster, then runs the frame check and a loudness check, in the background. | none | about 20 min |
| 4. Publish | Add the `video` field and credits, verify, PR. Liam watches the vertical cut and says "ship it"; it merges and deploys. | 3 min | 3 min |

### Kickoff questions (asked once, up front)

1. The recipe, and whether it has been cooked and tested. Only tested recipes go live.
2. Tonight's kitchen: equipment that is out of reach (air fryer, oven, grill) and ingredients being swapped. A swap becomes a choice on the same page, as Liam asked on 2026-11-02, rather than a second recipe.
3. Servings, and who is cooking.
4. Anything that should differ from the house defaults.

### Chef review checklist

Liam's list, from 2026-11-02: flavor, how the ingredients mix and play together, macros, micros, protein, cook times, and heat. Also check:

- texture contrast, and the balance of salt, acid, and fat
- what runs in parallel, and when to start the oven or the pan so everything lands together
- substitutions for common gaps
- safe internal temperatures for meat and eggs
- anything unusual a home cook might question (the beans side prompted that question today)

### House defaults (locked 2026-11-02; ask only to change one)

| Setting | Default |
| --- | --- |
| Look | The v4 3D product shot in the cream studio (`docs/recipes-media-v4.md`) |
| Voice | Kokoro `af_heart` at 0.9x speed, with the pronunciation dictionary in `video/narrate.py` |
| Pacing | 0.45 s between beats and a 1 s hold after each scene |
| Captions | 58 px (64 px in the vertical cut), near-black on an opaque cream card |
| Cuts | Both: 16:9 for the page, 9:16 for a phone |
| Sound | A soft music bed under the voice, and cooking sounds only where something real makes a sound. CC0 only, with levels as measured in the v4 spec. |
| Length | As long as the narration needs at this pace. Today's ran 113.6 s. Each extra 10 seconds of video adds about 50 seconds of render per cut. |
| Assets | CC0 (Poly Haven, Freesound) and Unsplash License photos, each credited in `video/CREDITS.md` |
| Review gates | The narration audio and the style stills before the final render. Liam's OK before any merge or deploy. |
| Sessions | One per stage, started from this playbook |

### Commands that work today

All video commands run inside `video/`, once the PRs for items B, D, and E (#13 to #15) merge. Until then they are on the branch `feat/recipe-narration-check`.

1. `node tools/fetch-assets.mjs` downloads the CC0 models, textures, lighting, and sounds listed in `assets.json`.
2. `.venv/bin/python tools/prepare_textures.py` cuts the photo textures. The source photos live outside the repo; `video/CREDITS.md` lists where each came from.
3. `node tools/bake-drop.mjs <slug>` bakes the physics from `src/recipes/<slug>.build.json`.
4. Write `src/recipes/<slug>.scenes.json` (format: `docs/adr/0004-recipe-video-scene-files.md`; the Smash Burger Bowl's is the worked example).
5. `.venv/bin/python narrate.py <slug>`, then `node tools/check-narration.mjs <slug>`: whisper.cpp checks every spoken line against the script.
6. `node tools/stills.mjs <bundle> <slug> <out-dir> <frame> ...` renders stills for the review pack, from a bundle made with `pnpm exec remotion bundle src/index.ts --out-dir <bundle>`.
7. `pnpm render <slug>`, in the background: narration and its whisper check, the scene check, both cuts with ANGLE at concurrency 5, the frame and loudness checks, then the web copy and poster into the site. It stops on a stall and exits non-zero on any failed check.
8. In the site root: `pnpm verify`, then a PR. After Liam's OK, merge, then deploy from `main` with `vercel deploy --prod --yes --scope liam87davis-5781s-projects`, until item F fixes deploy on merge.

Keep the Mac on power for a render. On 2026-11-03 it hibernated at 1% battery 6 minutes into one; the render's browser crashed, and the stall check stopped it on wake.

## What to build to get there (proposal; Liam's go for A, B, D, and E on 2026-11-02)

Ranked by payoff for the effort.

| Item | What it is | Size | Payoff |
| --- | --- | --- | --- |
| A. `/recipe` skill | Runs this playbook: kickoff questions, the chef checklist, house defaults, gates, and one session per stage. Triggers on Liam's words, such as "add this recipe", "new recipe", "put this on my site", and "make the video for". | Small | Removes the re-asking and the long single session |
| B. Scene templates | Turns the hand-written scenes into templates driven by `video/src/recipes/<slug>.scenes.json`: hero, pull-apart, prep (poke, microwave, press), mix (ingredients into a bowl with a running list), skillet (into the pan, stir, brown, with a smash and flip option), build, and finish. `HowTo.tsx` reads the scene list. Proven when the Smash Burger Bowl renders the same from its scene file. | Medium | A recipe built from known methods becomes data only |
| C. Kit for the four tested recipes | The egg bake, pancakes, chili, and beef and broccoli rice bowl need a baking dish, a griddle, a pot, and a stir-fry, plus their ingredients. Built once, after B, as parallel sessions. | Large, once | Each of those recipes then runs in the 40-minute path |
| D. One render command | `pnpm render <slug>` bundles once, renders both cuts with `--gl=angle`, writes the poster, runs the frame and loudness checks, and stops on a stall. Partly underway in the video session. | Small | Removes today's stall and the manual steps |
| E. Pronunciation check | whisper.cpp transcribes every narration clip and flags any line that does not match the script, before Liam hears it. Done by hand today. | Small | Catches "romaine as ramen" automatically |
| F. Deploy on merge | Relink the Vercel project's Git connection to `lmdav/personal-site`. This is a setting in Liam's Vercel account. | Tiny | Merging publishes; no CLI deploy |
| G. Video hosting | The cuts are 16 to 40 MB each and are committed under `public/`. Moving them to Vercel Blob keeps the repo small. Optional. | Small | A lighter repo as recipes grow |

## Status

| Piece | Status (last checked 2026-11-03, 09:20) |
| --- | --- |
| Recipe format, validator, verify gate, pages, cook mode | Built and live |
| The v4 video system and both cuts | Built and merged (PR #5) |
| The video on the recipe page, and sweet potato as a choice on one page | Built and merged (PRs #5, #10, #11) |
| This playbook | Committed in PR #12 |
| A. `/recipe` skill | Built: `~/.claude/skills/recipe/SKILL.md`, outside the repo. Not yet run on a real recipe. |
| B. Scene templates | Built (PR #13). The Smash Burger Bowl renders from `smash-burger-bowl.scenes.json`: 44 stills at 22 key moments, wide and vertical, are pixel-identical to the hand-written scenes, and the full wide cut is byte-identical to the one Liam approved. The bowl templates still draw only the Smash Burger Bowl (item C). |
| D. One render command | Built (PR #14). `pnpm render smash-burger-bowl` passed in one run on 2026-11-03: exit 0 in 27.1 min (13.2 and 12.6 min per cut), no blank or glitched frames, the mix at -22.8 LUFS with a -3.5 dBFS peak and every scene within 0.1 LU of its narration. The stall stop fired correctly when the Mac hibernated mid-render; a planted loud bed fails the loudness check. |
| E. Pronunciation check | Built (PR #15). All 29 narration lines match; a planted wrong line and the unfixed "romaine" both fail. |
| C. Kit for the four tested recipes | Not started |
| F. Deploy on merge | Not done; a setting in Liam's Vercel account |
| G. Video hosting | Not started |
| The 10 to 15 minute target | Untested until the next recipe runs through `/recipe` |
