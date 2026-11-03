import type { Recipe } from "./recipes";

/** Minutes as an ISO 8601 duration: 25 -> "PT25M", 75 -> "PT1H15M", 0 -> "PT0M". */
export function isoDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 || h === 0 ? `${m}M` : ""}`;
}

/** schema.org Recipe data for one recipe, so search engines can read it as a recipe. */
export function recipeJsonLd(recipe: Recipe, pageUrl: string) {
  const { nutrition: n } = recipe;
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.summary,
    url: pageUrl,
    datePublished: recipe.date,
    author: { "@type": "Person", name: "Liam Davis" },
    ...(recipe.image ? { image: [new URL(recipe.image.src, pageUrl).href] } : {}),
    recipeYield: recipe.servings === 1 ? "1 serving" : `${recipe.servings} servings`,
    prepTime: isoDuration(recipe.prepMinutes),
    cookTime: isoDuration(recipe.cookMinutes),
    totalTime: isoDuration(recipe.totalMinutes),
    keywords: recipe.tags.join(", "),
    recipeIngredient: recipe.ingredients.flatMap((group) => group.items),
    recipeInstructions: recipe.steps.map((step) => ({
      "@type": "HowToStep",
      name: step.title,
      text: step.text,
    })),
    nutrition: {
      "@type": "NutritionInformation",
      servingSize: "1 serving",
      calories: `${n.calories} calories`,
      proteinContent: `${n.protein} g`,
      carbohydrateContent: `${n.carbs} g`,
      fatContent: `${n.fat} g`,
      fiberContent: `${n.fiber} g`,
    },
  };
}

/**
 * JSON for a `<script type="application/ld+json">` tag. Escapes "<" so text
 * like "</script>" inside a recipe can never close the tag early.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
