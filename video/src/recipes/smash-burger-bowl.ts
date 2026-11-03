import type { Crop, StepCues } from "../types";

// Short on-screen lines for each step, in the same order as the recipe.
export const cues: StepCues = [
  "Poke and microwave on high for 5 to 6 min. Let them cool and dry for 5 min.",
  "Mix everything and chill it for at least 10 min.",
  "Medium-low until glossy and thick. Then keep them warm.",
  "Smash to 1/2 inch, oil, and salt. Air-fry at 400°F for 12 to 15 min.",
  "Dry pan first, 2 min untouched. Then oil, stir, and add Worcestershire.",
  "Romaine, tomato, onion, and pickles on one half of the bowl.",
  "Smoking-hot pan. Parchment, press flat, then hands off for 2 min.",
  "Hot food on the other half. Sauce over everything.",
];

// Regions of the 3200 x 2200 blueprint image (2x the 1600 x 1100 drawing).
const PLAN: Crop = { x: 140, y: 180, w: 1380, h: 1400 };
const POTATOES: Crop = { x: 700, y: 820, w: 520, h: 480 };
const PATTIES: Crop = { x: 760, y: 340, w: 560, h: 560 };
const SECTION: Crop = { x: 1760, y: 200, w: 1340, h: 560 };
const DETAIL: Crop = { x: 1500, y: 820, w: 760, h: 620 };

export const tour: Crop[] = [{ x: 0, y: 0, w: 3200, h: 2200 }, PLAN, SECTION, DETAIL];

export const stepCrops: Record<number, Crop> = {
  3: POTATOES,
  6: PATTIES,
  7: PLAN,
};
