import { test } from "node:test";
import assert from "node:assert/strict";
import { matches, numberWords, sounds } from "../video/tools/check-narration.mjs";

// The pronunciation check (video/tools/check-narration.mjs) compares what whisper.cpp hears
// with the script. These pairs are real: the script's line, and what whisper's base model
// heard from Kokoro on 2026-11-03.
const HEARD_RIGHT: [string, string][] = [
  ["Smash burger bowl. A burger and fries, rebuilt as a high-protein bowl, in about thirty minutes.", "Smash burger bowl. A burger and fries rebuilt as a high protein bowl in about 30 minutes."],
  ["Two smash patties with cheese.", "2 Smashpatties with Cheese"],
  ["Air-fry at four hundred degrees for twelve to fifteen minutes, until deep golden.", "Air fry at 400 degrees for 12 to 15 minutes, until deep golden."],
  ["Three tablespoons of Greek yogurt.", "3 tablespoons of Greek yogurt."],
  ["Build the bowl in two halves.", "Build the bowl into halves."],
  ["About nine hundred calories and fifty-seven grams of protein. The full recipe is at L M Dav dot com.", "About 900 calories and 57 grams of protein. The full recipe is at LMDAV.com."],
  ["Romaine, tomato, onion, and pickles.", " [BLANK_AUDIO] Romaine, tomato, onion, and pickles."],
];

test("lines whisper heard correctly match, whatever its spelling", () => {
  for (const [said, heard] of HEARD_RIGHT) assert.ok(matches(said, heard), `${said}\n  vs ${heard}\n  ${sounds(said)}\n  ${sounds(heard)}`);
});

test("a mispronounced or wrong word does not match", () => {
  // The voice's old "romaine" (2026-11-02).
  assert.ok(!matches("Romaine, tomato, onion, and pickles.", "Ramen, tomato, onion, and pickles."));
  assert.ok(!matches("A pinch of garlic powder and smoked paprika.", "A pinch of garlic powder and smoked pepper."));
  assert.ok(!matches("Crispy potatoes.", "Crispy potato."));
  assert.ok(!matches("Air-fry at four hundred degrees.", "Air fry at 450 degrees."));
  assert.ok(!matches("Stir until pink, and chill.", ""));
  // An empty script line never matches, not even silence (2026-11-03 review).
  assert.ok(!matches("", " [BLANK_AUDIO]"));
  assert.ok(!matches("(pause)", ""));
});

test("numbers are spelled the way the script says them", () => {
  assert.equal(numberWords(57), "fifty seven");
  assert.equal(numberWords(400), "four hundred");
  assert.equal(numberWords(1250), "one thousand two hundred fifty");
  assert.equal(sounds("1,250"), sounds("one thousand two hundred fifty"));
  assert.equal(sounds("1,250,000"), sounds("1250000"));
  assert.notEqual(sounds("Bake for 1000000 hours"), sounds("Bake for hours"));
});
