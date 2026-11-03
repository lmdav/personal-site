import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { REMOTE_IMAGE_HOSTS } from "./site.ts";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type IngredientGroup = { name?: string; items: string[] };
export type RecipeStep = { title: string; minutes?: number; text: string };
export type RecipeTip = { title?: string; text: string };
export type RecipeImage = {
  /** Path under /public or an https URL. */
  src: string;
  /** Describes the photo for screen readers. */
  alt: string;
  /** Only for a photo whose license asks for credit. Unsplash photos do not, and the
   * recipe pages show no credit for them. */
  credit?: string;
  creditUrl?: string;
};
/** A short how-to video and its poster frame. Both live in public/. */
export type RecipeVideo = { src: string; poster: string };
export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Always true: the page labels every number as an estimate. */
  estimate: true;
  note?: string;
};

export type Recipe = {
  slug: string;
  title: string;
  /** A short name for this version when a recipe comes in more than one, like
   * "Sweet potato". Shown on the choice buttons. */
  variant?: string;
  /** The slug of the main recipe this one is another version of. A version has no page
   * or card of its own: it is a choice on the main recipe's page. */
  variantOf?: string;
  summary: string;
  /** Publish date as YYYY-MM-DD. Sorts the index, newest first. */
  date: string;
  servings: number;
  servingsNote?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  tags: string[];
  image?: RecipeImage;
  video?: RecipeVideo;
  ingredients: IngredientGroup[];
  steps: RecipeStep[];
  tips: RecipeTip[];
  nutrition: Nutrition;
  /** Chef's notes: the file body, split into plain-text paragraphs. */
  notes: string[];
};

export class RecipeError extends Error {}

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");
export const PUBLIC_DIR = path.join(process.cwd(), "public");

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

/**
 * Reads every recipe in `dir`, newest first. README.md, files starting with
 * "_" (the template), and hidden files (such as macOS "._" copies) are
 * skipped. Throws a RecipeError naming the file and every bad field, which
 * fails the build.
 */
export function loadRecipes(dir: string = RECIPES_DIR, publicDir: string = PUBLIC_DIR): Recipe[] {
  const files = readdirSync(dir).filter(
    (f) =>
      f.toLowerCase().endsWith(".md") &&
      f !== "README.md" &&
      !f.startsWith("_") &&
      !f.startsWith("."),
  );
  const recipes = files.map((file) => {
    const recipe = parseRecipe(readFileSync(path.join(dir, file), "utf8"), file);
    if (`${recipe.slug}.md` !== file) {
      throw new RecipeError(
        `${file}: slug "${recipe.slug}" must match the file name (${recipe.slug}.md)`,
      );
    }
    const local = [recipe.image?.src, recipe.video?.src, recipe.video?.poster];
    for (const src of local) {
      if (src?.startsWith("/") && !existsSync(path.join(publicDir, src))) {
        throw new RecipeError(`${file}: "${src}" is not in the public folder`);
      }
    }
    return recipe;
  });
  checkVersions(recipes);
  return recipes.sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  );
}

export function getRecipe(slug: string, dir?: string): Recipe | undefined {
  return loadRecipes(dir).find((r) => r.slug === slug);
}

/** Every version must point at a main recipe, and every recipe in a family needs its
 * own version name, so the page can offer the choice. */
function checkVersions(recipes: Recipe[]) {
  const bySlug = new Map(recipes.map((r) => [r.slug, r]));
  for (const r of recipes) {
    if (!r.variantOf) continue;
    const main = bySlug.get(r.variantOf);
    if (!main) throw new RecipeError(`${r.slug}.md: variantOf "${r.variantOf}" is not a recipe`);
    if (main.variantOf) {
      throw new RecipeError(`${r.slug}.md: variantOf must name a main recipe, but "${main.slug}" is itself a version of "${main.variantOf}"`);
    }
    const family = versionsOf(main.slug, recipes);
    for (const v of family) {
      if (!v.variant) throw new RecipeError(`${v.slug}.md: variant is required, since this recipe comes in more than one version`);
    }
    const keys = family.map(versionKey);
    if (new Set(keys).size !== keys.length) {
      throw new RecipeError(`${main.slug}.md: its versions need different variant names (${family.map((v) => v.variant).join(", ")})`);
    }
  }
}

/** The recipes with their own page and card: every one that is not a version of another. */
export function mainRecipes(recipes: Recipe[] = loadRecipes()): Recipe[] {
  return recipes.filter((r) => !r.variantOf);
}

/** A main recipe and its other versions, the main one first. Empty if `slug` is not a
 * main recipe. */
export function versionsOf(slug: string, recipes: Recipe[] = loadRecipes()): Recipe[] {
  const main = recipes.find((r) => r.slug === slug && !r.variantOf);
  return main ? [main, ...recipes.filter((r) => r.variantOf === slug)] : [];
}

/** How a version is named in the page address, from its variant name: "Sweet potato"
 * becomes ?version=sweet-potato. */
export function versionKey(recipe: Recipe): string {
  return (recipe.variant ?? recipe.slug).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Old addresses of versions that used to be separate recipes now open the main page
 * with that version chosen. Used by next.config.ts. */
export function versionRedirects(recipes: Recipe[] = loadRecipes()) {
  return recipes
    .filter((r) => r.variantOf)
    .map((r) => ({ source: `/recipes/${r.slug}`, destination: `/recipes/${r.variantOf}?version=${versionKey(r)}`, permanent: true }));
}

/* ------------------------------------------------------------------ */
/* Parsing and validation                                              */
/* ------------------------------------------------------------------ */

const TOP_FIELDS = [
  "title", "slug", "variant", "variantOf", "summary", "date", "servings", "servingsNote", "prepMinutes",
  "cookMinutes", "totalMinutes", "tags", "image", "video", "ingredients", "steps", "tips",
  "nutrition",
] as const;
const NUTRIENTS = ["calories", "protein", "carbs", "fat", "fiber"] as const;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// House style: no em or en dashes anywhere in published copy.
const DASHES = /[\u2013\u2014]/;
const DASH_HINT = "must not contain em or en dashes (use a comma, colon, or period)";
// Upper bounds catch typos such as an extra zero.
const MAX_MINUTES = 7 * 24 * 60;
const MAX_SERVINGS = 100;

type Obj = Record<string, unknown>;

const isObj = (x: unknown): x is Obj =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/** Collects every problem in a file so one build run reports them all. */
class Checker {
  errors: string[] = [];

  fields(obj: Obj, allowed: readonly string[], at: string) {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) this.errors.push(`${at}${key}: unknown field`);
    }
  }

  text(obj: Obj, key: string, at: string, optional = false): string | undefined {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (!optional) this.errors.push(`${at}${key} is required`);
      return undefined;
    }
    return this.textValue(value, `${at}${key}`);
  }

  textValue(value: unknown, at: string): string | undefined {
    if (typeof value === "string" && value.trim() !== "") {
      if (DASHES.test(value)) this.errors.push(`${at} ${DASH_HINT}`);
      return value.trim();
    }
    // A bare `- 1/2 onion: sliced` reads as a key-value pair in YAML.
    const hint = isObj(value) ? ' (wrap it in quotes if it contains ": ")' : "";
    this.errors.push(`${at} must be text${hint}`);
    return undefined;
  }

  count(
    obj: Obj,
    key: string,
    at: string,
    { optional = false, min = 1, max = MAX_MINUTES } = {},
  ) {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (!optional) this.errors.push(`${at}${key} is required`);
      return undefined;
    }
    if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
      this.errors.push(`${at}${key} must be a whole number from ${min} to ${max}`);
      return undefined;
    }
    return value as number;
  }

  amount(obj: Obj, key: string, at: string) {
    const value = obj[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      this.errors.push(`${at}${key} must be a number of 0 or more`);
      return 0;
    }
    return value;
  }

  list(obj: Obj, key: string, at: string, optional = false): unknown[] {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (!optional) this.errors.push(`${at}${key} is required`);
      return [];
    }
    if (!Array.isArray(value) || (!optional && value.length === 0)) {
      this.errors.push(`${at}${key} must be a list${optional ? "" : " with at least one entry"}`);
      return [];
    }
    return value;
  }

  object(value: unknown, at: string): Obj {
    if (isObj(value)) return value;
    this.errors.push(`${at} must be a group of fields`);
    return {};
  }
}

/** Splits a recipe file into YAML frontmatter and body, then validates it. */
export function parseRecipe(source: string, fileName: string): Recipe {
  // Some editors save a byte-order mark before the first "---".
  const text = source.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n([\s\S]*))?$/.exec(text);
  if (!match) {
    throw new RecipeError(`${fileName}: must start with YAML frontmatter between two --- lines`);
  }

  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (err) {
    throw new RecipeError(`${fileName}: the frontmatter is not valid YAML. ${(err as Error).message}`);
  }

  const c = new Checker();
  const top = c.object(data, "frontmatter");
  c.fields(top, TOP_FIELDS, "");

  const slug = c.text(top, "slug", "");
  if (slug && !KEBAB.test(slug)) {
    c.errors.push(`slug must be lowercase words joined by hyphens, like "smash-burger-bowl"`);
  }

  const date = c.text(top, "date", "");
  if (date && !isCalendarDate(date)) {
    c.errors.push(`date must be a real date written as YYYY-MM-DD`);
  }

  let image: RecipeImage | undefined;
  if (top.image !== undefined && top.image !== null) {
    const img = c.object(top.image, "image");
    c.fields(img, ["src", "alt", "credit", "creditUrl"], "image.");
    const src = c.text(img, "src", "image.");
    if (src && !isImageReference(src)) {
      c.errors.push(`image.src must be a path under /public (starting with "/") or an https URL`);
    } else if (src?.startsWith("https://") && !REMOTE_IMAGE_HOSTS.includes(new URL(src).hostname)) {
      c.errors.push(
        `image.src can only link to ${REMOTE_IMAGE_HOSTS.join(", ")}. Put other photos in the public folder.`,
      );
    }
    const creditUrl = c.text(img, "creditUrl", "image.", true);
    if (creditUrl && !(creditUrl.startsWith("https://") && isImageReference(creditUrl))) {
      c.errors.push("image.creditUrl must be an https URL");
    }
    image = {
      src: src ?? "",
      alt: c.text(img, "alt", "image.") ?? "",
      credit: c.text(img, "credit", "image.", true),
      creditUrl,
    };
  }

  let video: RecipeVideo | undefined;
  if (top.video !== undefined && top.video !== null) {
    const v = c.object(top.video, "video");
    c.fields(v, ["src", "poster"], "video.");
    video = { src: localPath(c, v, "src", "video."), poster: localPath(c, v, "poster", "video.") };
  }

  const tags = c.list(top, "tags", "").map((t, i) => c.textValue(t, `tags[${i}]`) ?? "");

  const ingredients = c.list(top, "ingredients", "").map((raw, i) => {
    const at = `ingredients[${i}].`;
    const group = c.object(raw, `ingredients[${i}]`);
    c.fields(group, ["name", "items"], at);
    return {
      name: c.text(group, "name", at, true),
      items: c.list(group, "items", at).map((item, j) => c.textValue(item, `${at}items[${j}]`) ?? ""),
    };
  });

  const steps = c.list(top, "steps", "").map((raw, i) => {
    const at = `steps[${i}].`;
    const step = c.object(raw, `steps[${i}]`);
    c.fields(step, ["title", "minutes", "text"], at);
    return {
      title: c.text(step, "title", at) ?? "",
      minutes: c.count(step, "minutes", at, { optional: true }),
      text: c.text(step, "text", at) ?? "",
    };
  });

  const tips = c.list(top, "tips", "", true).map((raw, i) => {
    const at = `tips[${i}].`;
    const tip = c.object(raw, `tips[${i}]`);
    c.fields(tip, ["title", "text"], at);
    return { title: c.text(tip, "title", at, true), text: c.text(tip, "text", at) ?? "" };
  });

  const n = isObj(top.nutrition) ? top.nutrition : undefined;
  if (!n) c.errors.push("nutrition is required");
  const nut = n ?? {};
  c.fields(nut, [...NUTRIENTS, "estimate", "note"], "nutrition.");
  if (n && nut.estimate !== true) {
    c.errors.push("nutrition.estimate must be true (the page labels the numbers as estimates)");
  }

  const prepMinutes = c.count(top, "prepMinutes", "", { min: 0 });
  const cookMinutes = c.count(top, "cookMinutes", "", { min: 0 });
  const totalMinutes = c.count(top, "totalMinutes", "");
  if (
    prepMinutes !== undefined &&
    cookMinutes !== undefined &&
    totalMinutes !== undefined &&
    totalMinutes < Math.max(prepMinutes, cookMinutes)
  ) {
    c.errors.push("totalMinutes must be at least as long as prepMinutes and cookMinutes");
  }

  const body = match[2] ?? "";
  if (DASHES.test(body)) c.errors.push(`the chef's notes ${DASH_HINT}`);

  const variantOf = c.text(top, "variantOf", "", true);
  if (variantOf && !KEBAB.test(variantOf)) {
    c.errors.push(`variantOf must be the slug of another recipe, like "smash-burger-bowl"`);
  }

  const recipe: Recipe = {
    slug: slug ?? "",
    title: c.text(top, "title", "") ?? "",
    variant: c.text(top, "variant", "", true),
    variantOf,
    summary: c.text(top, "summary", "") ?? "",
    date: date ?? "",
    servings: c.count(top, "servings", "", { max: MAX_SERVINGS }) ?? 1,
    servingsNote: c.text(top, "servingsNote", "", true),
    prepMinutes: prepMinutes ?? 0,
    cookMinutes: cookMinutes ?? 0,
    totalMinutes: totalMinutes ?? 0,
    tags,
    image,
    video,
    ingredients,
    steps,
    tips,
    nutrition: {
      calories: c.amount(nut, "calories", "nutrition."),
      protein: c.amount(nut, "protein", "nutrition."),
      carbs: c.amount(nut, "carbs", "nutrition."),
      fat: c.amount(nut, "fat", "nutrition."),
      fiber: c.amount(nut, "fiber", "nutrition."),
      estimate: true,
      note: c.text(nut, "note", "nutrition.", true),
    },
    notes: body
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  };

  if (c.errors.length > 0) {
    throw new RecipeError(
      `${fileName} has ${c.errors.length} problem(s):\n- ${c.errors.join("\n- ")}`,
    );
  }
  return recipe;
}

/** A required path to a file in public/, such as "/recipes/bowl/blueprint.png". */
function localPath(c: Checker, obj: Obj, key: string, at: string): string {
  const value = c.text(obj, key, at);
  if (value && (!value.startsWith("/") || !isImageReference(value))) {
    c.errors.push(`${at}${key} must be a path in the public folder, starting with "/"`);
  }
  return value ?? "";
}

/** A site path like "/recipes/bowl.jpg" or an absolute https URL, nothing else. */
function isImageReference(value: string): boolean {
  if (/\s/.test(value) || value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "";
  } catch {
    return false;
  }
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/* ------------------------------------------------------------------ */
/* Display helpers                                                     */
/* ------------------------------------------------------------------ */

/** 25 -> "25 min", 60 -> "1 hr", 75 -> "1 hr 15 min". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** "2026-11-02" -> "Nov 2, 2026", read as a calendar date with no time zone shift. */
export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
