import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type IngredientGroup = { name?: string; items: string[] };
export type RecipeStep = { title: string; minutes?: number; text: string };
export type RecipeTip = { title?: string; text: string };
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
  summary: string;
  /** Publish date as YYYY-MM-DD. Sorts the index, newest first. */
  date: string;
  servings: number;
  servingsNote?: string;
  prepMinutes: number;
  cookMinutes: number;
  totalMinutes: number;
  tags: string[];
  /** Path under /public or an https URL. */
  image?: string;
  ingredients: IngredientGroup[];
  steps: RecipeStep[];
  tips: RecipeTip[];
  nutrition: Nutrition;
  /** Chef's notes: the file body, split into plain-text paragraphs. */
  notes: string[];
};

export class RecipeError extends Error {}

export const RECIPES_DIR = path.join(process.cwd(), "content", "recipes");

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

/**
 * Reads every recipe in `dir`, newest first. README.md and files starting
 * with "_" (the template) are skipped. Throws a RecipeError naming the file
 * and every bad field, which fails the build.
 */
export function loadRecipes(dir: string = RECIPES_DIR): Recipe[] {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"),
  );
  const recipes = files.map((file) => {
    const recipe = parseRecipe(readFileSync(path.join(dir, file), "utf8"), file);
    if (`${recipe.slug}.md` !== file) {
      throw new RecipeError(
        `${file}: slug "${recipe.slug}" must match the file name (${recipe.slug}.md)`,
      );
    }
    return recipe;
  });
  return recipes.sort(
    (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
  );
}

export function getRecipe(slug: string, dir?: string): Recipe | undefined {
  return loadRecipes(dir).find((r) => r.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Parsing and validation                                              */
/* ------------------------------------------------------------------ */

const TOP_FIELDS = [
  "title", "slug", "summary", "date", "servings", "servingsNote", "prepMinutes",
  "cookMinutes", "totalMinutes", "tags", "image", "ingredients", "steps", "tips",
  "nutrition",
] as const;
const NUTRIENTS = ["calories", "protein", "carbs", "fat", "fiber"] as const;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    // A bare `- 1/2 onion: sliced` reads as a key-value pair in YAML.
    const hint = isObj(value) ? ' (wrap it in quotes if it contains ": ")' : "";
    this.errors.push(`${at} must be text${hint}`);
    return undefined;
  }

  count(obj: Obj, key: string, at: string, { optional = false, min = 1 } = {}) {
    const value = obj[key];
    if (value === undefined || value === null) {
      if (!optional) this.errors.push(`${at}${key} is required`);
      return undefined;
    }
    if (!Number.isInteger(value) || (value as number) < min) {
      this.errors.push(`${at}${key} must be a whole number of at least ${min}`);
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
  const match = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n([\s\S]*))?$/.exec(source);
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

  const image = c.text(top, "image", "", true);
  if (image && !image.startsWith("/") && !image.startsWith("https://")) {
    c.errors.push(`image must be a path under /public (starting with "/") or an https URL`);
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

  const recipe: Recipe = {
    slug: slug ?? "",
    title: c.text(top, "title", "") ?? "",
    summary: c.text(top, "summary", "") ?? "",
    date: date ?? "",
    servings: c.count(top, "servings", "") ?? 1,
    servingsNote: c.text(top, "servingsNote", "", true),
    prepMinutes: c.count(top, "prepMinutes", "", { min: 0 }) ?? 0,
    cookMinutes: c.count(top, "cookMinutes", "", { min: 0 }) ?? 0,
    totalMinutes: c.count(top, "totalMinutes", "") ?? 0,
    tags,
    image,
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
    notes: (match[2] ?? "")
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
