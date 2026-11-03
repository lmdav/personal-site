// The subset of the site's Recipe type (lib/recipes.ts) that the video uses.
export type VideoRecipe = {
  slug: string;
  title: string;
  servings: number;
  totalMinutes: number;
  ingredients: { name?: string; items: string[] }[];
  steps: { title: string; minutes?: number; text: string }[];
  nutrition: { calories: number; protein: number; fiber: number };
};

/** Video-only copy: one short line per step, readable in about 3 seconds. */
export type StepCues = string[];

/** A region of the blueprint image to zoom to, in image pixels (3200 x 2200). */
export type Crop = { x: number; y: number; w: number; h: number };

export type HowToProps = {
  recipe: VideoRecipe;
  cues: StepCues;
  blueprint: string;
  /** Optional blueprint crop shown beside a step, keyed by step index. */
  stepCrops: Record<number, Crop>;
  tour: Crop[];
};
