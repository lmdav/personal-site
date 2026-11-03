import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  formatDate,
  formatMinutes,
  loadRecipes,
  parseRecipe,
  RECIPES_DIR,
  RecipeError,
} from "../lib/recipes.ts";
import { isoDuration, recipeJsonLd, serializeJsonLd } from "../lib/recipe-jsonld.ts";

const VALID = `---
title: "Test Bowl"
slug: test-bowl
summary: "A bowl for tests."
date: 2026-01-05
servings: 2
prepMinutes: 5
cookMinutes: 10
totalMinutes: 15
tags: [quick]
ingredients:
  - name: "Bowl"
    items:
      - "1 cup rice"
  - items:
      - "Salt"
steps:
  - title: "Cook"
    minutes: 10
    text: "Cook the rice."
  - title: "Serve"
    text: "Put it in a bowl."
nutrition:
  calories: 400
  protein: 30
  carbs: 50
  fat: 8
  fiber: 6
  estimate: true
---

First note paragraph.

Second  note
paragraph.
`;

/** Returns VALID with one frontmatter line replaced (or removed when `to` is empty). */
const edit = (from: string, to: string) => {
  assert.ok(VALID.includes(from), `fixture has no "${from}"`);
  return VALID.replace(from, to);
};

const problems = (source: string) => {
  try {
    parseRecipe(source, "test.md");
  } catch (err) {
    assert.ok(err instanceof RecipeError);
    return err.message;
  }
  assert.fail("expected the recipe to be rejected");
};

const tempDir = (files: Record<string, string>) => {
  const dir = mkdtempSync(path.join(tmpdir(), "recipes-"));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);
  return dir;
};

/* ------------------------------------------------------------------ */
/* parseRecipe                                                         */
/* ------------------------------------------------------------------ */

test("parses a valid recipe, including optional fields left out", () => {
  const r = parseRecipe(VALID, "test-bowl.md");
  assert.equal(r.slug, "test-bowl");
  assert.equal(r.date, "2026-01-05");
  assert.deepEqual(r.ingredients, [
    { name: "Bowl", items: ["1 cup rice"] },
    { name: undefined, items: ["Salt"] },
  ]);
  assert.deepEqual(r.steps[1], { title: "Serve", minutes: undefined, text: "Put it in a bowl." });
  assert.deepEqual(r.tips, []);
  assert.equal(r.nutrition.protein, 30);
  assert.deepEqual(r.notes, ["First note paragraph.", "Second note paragraph."]);
});

test("reports every missing required field in one error", () => {
  const msg = problems(edit('title: "Test Bowl"\n', "").replace("servings: 2\n", ""));
  assert.match(msg, /2 problem/);
  assert.match(msg, /title is required/);
  assert.match(msg, /servings is required/);
});

test("rejects a line YAML reads as a key-value pair, with a hint to quote it", () => {
  const msg = problems(edit('- "1 cup rice"', "- 1/2 onion: sliced"));
  assert.match(msg, /ingredients\[0\]\.items\[0\] must be text \(wrap it in quotes/);
});

test("rejects unknown fields so typos in optional fields are caught", () => {
  assert.match(problems(edit("tags:", 'sumary: "x"\ntags:')), /sumary: unknown field/);
  assert.match(problems(edit("    text: \"Cook the rice.\"", "    txt: \"x\"")), /steps\[0\]\.txt: unknown field/);
});

test("requires nutrition to be marked as an estimate", () => {
  assert.match(problems(edit("estimate: true", "estimate: false")), /estimate must be true/);
  assert.match(problems(VALID.replace(/nutrition:[\s\S]*?estimate: true\n/, "")), /nutrition is required/);
});

test("rejects bad numbers, dates, slugs, and empty lists", () => {
  assert.match(problems(edit("prepMinutes: 5", "prepMinutes: 5.5")), /prepMinutes must be a whole number/);
  assert.match(problems(edit("servings: 2", "servings: 0")), /servings must be a whole number from 1 to 100/);
  assert.match(problems(edit("totalMinutes: 15", "totalMinutes: 150000")), /totalMinutes must be a whole number from 1 to/);
  assert.match(problems(edit("totalMinutes: 15", "totalMinutes: 6")), /totalMinutes must be at least as long/);
  assert.match(problems(edit("date: 2026-01-05", "date: 2026-02-30")), /date must be a real date/);
  assert.match(problems(edit("slug: test-bowl", "slug: Test Bowl")), /slug must be lowercase/);
  assert.match(problems(edit("tags: [quick]", "tags: []")), /tags must be a list with at least one entry/);
  assert.match(problems(edit("calories: 400", "calories: lots")), /nutrition\.calories must be a number/);
});

test("rejects a file without frontmatter or with broken YAML", () => {
  assert.throws(() => parseRecipe("# Just markdown\n", "x.md"), /must start with YAML frontmatter/);
  assert.throws(() => parseRecipe("---\ntitle: [unclosed\n---\n", "x.md"), /not valid YAML/);
});

test("accepts a file saved with a byte-order mark or Windows line endings", () => {
  assert.equal(parseRecipe(`\uFEFF${VALID}`, "test-bowl.md").slug, "test-bowl");
  assert.equal(parseRecipe(VALID.replace(/\n/g, "\r\n"), "test-bowl.md").notes.length, 2);
});

test("rejects em and en dashes in any text field and in the notes", () => {
  const em = "\u2014";
  assert.match(problems(edit("A bowl for tests.", `A bowl ${em} for tests.`)), /summary must not contain em or en dashes/);
  assert.match(problems(edit('"1 cup rice"', `"1 cup rice \u2013 rinsed"`)), /items\[0\] must not contain em/);
  assert.match(problems(edit("First note paragraph.", `First ${em} note.`)), /chef's notes must not contain em/);
});

const withImage = (src: string, extra = "") =>
  edit("tags: [quick]", `image:\n  src: "${src}"\n  alt: "A bowl"${extra}\ntags: [quick]`);

test("accepts only site paths and https URLs as images", () => {
  for (const ok of ["/recipes/bowl.jpg", "https://images.unsplash.com/photo-1?w=1600&q=80"]) {
    assert.equal(parseRecipe(withImage(ok), "test-bowl.md").image?.src, ok);
  }
  assert.match(problems(withImage("https://images.example.com/bowl.jpg")), /image\.src can only link to images\.unsplash\.com/);
  for (const bad of ["https://", "//evil.example/x.png", "https://exa mple.com/a.png", "http://example.com/a.png", "bowl.jpg"]) {
    assert.match(problems(withImage(bad)), /image\.src must be a path under \/public/, bad);
  }
});

test("requires alt text on an image and an https credit link", () => {
  const noAlt = edit("tags: [quick]", 'image:\n  src: "/recipes/bowl.jpg"\ntags: [quick]');
  assert.match(problems(noAlt), /image\.alt is required/);
  const credited = withImage("/a.jpg", '\n  credit: "Photo by A on Unsplash"\n  creditUrl: "https://unsplash.com/photos/a"');
  assert.equal(parseRecipe(credited, "test-bowl.md").image?.credit, "Photo by A on Unsplash");
  assert.match(problems(withImage("/a.jpg", '\n  creditUrl: "/photos/a"')), /creditUrl must be an https URL/);
});

/* ------------------------------------------------------------------ */
/* loadRecipes                                                         */
/* ------------------------------------------------------------------ */

test("sorts newest first and skips README and underscore files", () => {
  const older = VALID.replace("slug: test-bowl", "slug: older").replace("2026-01-05", "2025-12-01");
  const dir = tempDir({
    "older.md": older,
    "test-bowl.md": VALID,
    "README.md": "not a recipe",
    "_draft.md": "not a recipe either",
  });
  assert.deepEqual(loadRecipes(dir).map((r) => r.slug), ["test-bowl", "older"]);
});

test("requires the slug to match the file name", () => {
  const dir = tempDir({ "other-name.md": VALID });
  assert.throws(() => loadRecipes(dir), /slug "test-bowl" must match the file name/);
});

test("skips hidden files and flags an upper-case extension instead of ignoring it", () => {
  assert.deepEqual(loadRecipes(tempDir({ "test-bowl.md": VALID, "._test-bowl.md": "\0\0junk" })).map((r) => r.slug), ["test-bowl"]);
  assert.throws(() => loadRecipes(tempDir({ "test-bowl.MD": VALID })), /must match the file name/);
});

test("requires a local image to exist in the public folder", () => {
  const dir = tempDir({ "test-bowl.md": withImage("/recipes/bowl.jpg") });
  assert.throws(() => loadRecipes(dir, tempDir({})), /image "\/recipes\/bowl.jpg" is not in the public folder/);

  const publicDir = tempDir({});
  mkdirSync(path.join(publicDir, "recipes"));
  writeFileSync(path.join(publicDir, "recipes", "bowl.jpg"), "");
  assert.equal(loadRecipes(dir, publicDir)[0].image?.src, "/recipes/bowl.jpg");
});

test("every published recipe and the template are valid", () => {
  assert.ok(loadRecipes().length >= 1);
  const template = readFileSync(path.join(RECIPES_DIR, "_template.md"), "utf8");
  assert.equal(parseRecipe(template, "_template.md").slug, "recipe-title");
});

test("every published recipe produces complete schema.org Recipe data", () => {
  for (const r of loadRecipes()) {
    const ld = recipeJsonLd(r, `https://lmdav.com/recipes/${r.slug}`);
    for (const key of ["name", "description", "recipeYield", "prepTime", "cookTime", "totalTime", "keywords"] as const) {
      assert.ok(ld[key], `${r.slug}: ${key} is empty`);
    }
    assert.ok(ld.recipeIngredient.length > 0 && ld.recipeInstructions.length > 0, r.slug);
    assert.match(ld.nutrition.calories, /^\d+(\.\d+)? calories$/, r.slug);
  }
});

/* ------------------------------------------------------------------ */
/* Formatting and JSON-LD                                              */
/* ------------------------------------------------------------------ */

test("formats minutes and dates for display", () => {
  assert.equal(formatMinutes(25), "25 min");
  assert.equal(formatMinutes(60), "1 hr");
  assert.equal(formatMinutes(75), "1 hr 15 min");
  assert.equal(formatDate("2026-11-02"), "Nov 2, 2026");
  assert.equal(formatDate("2026-01-01"), "Jan 1, 2026");
});

test("converts minutes to ISO 8601 durations", () => {
  assert.equal(isoDuration(0), "PT0M");
  assert.equal(isoDuration(25), "PT25M");
  assert.equal(isoDuration(60), "PT1H");
  assert.equal(isoDuration(75), "PT1H15M");
});

test("builds schema.org Recipe data with every ingredient and step", () => {
  const r = parseRecipe(VALID, "test-bowl.md");
  const ld = recipeJsonLd(r, "https://lmdav.com/recipes/test-bowl");
  assert.equal(ld["@type"], "Recipe");
  assert.equal(ld.recipeYield, "2 servings");
  assert.equal(ld.totalTime, "PT15M");
  assert.deepEqual(ld.recipeIngredient, ["1 cup rice", "Salt"]);
  assert.equal(ld.recipeInstructions.length, 2);
  assert.equal(ld.nutrition.proteinContent, "30 g");
  assert.equal("image" in ld, false);

  const pictured = recipeJsonLd({ ...r, image: { src: "/recipes/bowl.jpg", alt: "A bowl" } }, "https://lmdav.com/recipes/test-bowl");
  assert.deepEqual(pictured.image, ["https://lmdav.com/recipes/bowl.jpg"]);
});

test("escapes < so recipe text cannot close the script tag", () => {
  const json = serializeJsonLd({ text: "</script><script>alert(1)</script>" });
  assert.equal(json.includes("<"), false);
  assert.deepEqual(JSON.parse(json), { text: "</script><script>alert(1)</script>" });
});
