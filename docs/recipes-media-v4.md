# Recipe media v4: proposal

Status: proposed, waiting for Liam's go-ahead. Last updated 2026-11-02. This supersedes the look and animation in `recipes-media-v3.md`. The recipe fields, the `video/` package, the render command, and the Kokoro narration pipeline all stay.

## Feedback on v3 (from Liam)

- The parts were not traced. They were drawn from scratch in code (ellipses, noise, hatching), so they look like a diagram, "the inside of a cell in a bio textbook", not real food.
- The animations feel rudimentary and do not flow together.
- He wants a product shot: everything pulls apart, then goes back together into one cohesive, good-looking finished bowl. It should be realistic, smooth, and professional.
- The process should be a system that can be repeated for any recipe.
- The narration says "romaine" like "ramen" and "patties" strangely.
- The video does not explain the sauce.

## Direction A (recommended): traced photo assets, 2.5D product shot

**Assets traced from real photos.** For each ingredient:
1. Take one free photo whose license allows changes (Unsplash or Pexels), or Liam's own.
2. Remove the background.
3. Clean up the cutout so the light comes from the same direction for every part.

The cutout can then go one of two ways:
- **Clean illustrated look:** trace it into a vector with a color tracer (vtracer, 12 to 24 colors).
- **Photo look:** keep the high-resolution cutout.

Each asset is saved with a small manifest entry: its source and credit, anchor point, size, layer order in the bowl, label, and amount. Liam reviews an asset sheet before any animation.

**The product shot.** Remotion, in 2.5D (flat layers moved and scaled to fake depth):
1. **Hero:** the finished bowl on a warm studio background, with a soft contact shadow and a slow push in.
2. **Explode:** the layers lift off the bowl one after another along a vertical axis: sauce, toppings, cheese, patties, mushrooms, potatoes, lettuce, and the bowl. Each one is labeled with its name and amount.
3. **Steps:** the camera moves to one layer at a time, and that layer's action plays with the real cutouts. The potato gets pressed and crisps. The sauce ingredients drop into the cup with labels and get stirred. The beef ball is smashed under parchment and the crust forms.
4. **Reassemble:** the layers fall back into place in build order with overlapping timing and a small settle. The sauce drizzle draws on, and the video ends on the hero shot.

**Motion rules** (what makes product reveals feel smooth, checked frame by frame on renders):
- Stagger each layer by 3 to 5 frames, so things never all move at once.
- Ease out with a slight overshoot and settle.
- Keep one light direction and soft contact shadows that grow and shrink with height.
- Add motion blur on fast moves, and a slow camera drift during holds.
- Hold key frames for 0.5 to 1 seconds so the eye can read them.

**Narration:**
- A pronunciation dictionary with phoneme overrides for "romaine" and "patties", plus any new words.
- A sauce scene that names each sauce ingredient.
- Liam listens to each line before the full render.

**The repeatable system.** A recipe needs three inputs: the recipe file, an asset manifest that maps each ingredient to its photo, and a narration script. `pnpm render <slug>` does the rest. Ingredients already traced are reused across recipes.

**Proof first.** Before redoing everything, build a 10 to 15 second test: the bowl exploding and reassembling with traced assets.

## Direction B: real 3D

Free 3D models rendered with Three.js inside Remotion (`@remotion/three`), with studio lighting and real camera moves. This gives the best camera work, but it is hard to keep realistic and consistent:
- Free CC0 food kits look cartoony.
- Realistic CC-BY scans vary a lot in quality and need credit.
- AI-made 3D models cost credits.

This could be a later upgrade once the system exists.
