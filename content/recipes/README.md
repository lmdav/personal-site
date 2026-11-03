# Adding a recipe

Each recipe is one file in this folder. Adding a recipe needs no code changes.

1. Copy `_template.md` to `<slug>.md`, where the slug is the recipe name in lowercase words joined by hyphens (for example `turkey-chili.md`). The slug becomes the web address: `lmdav.com/recipes/turkey-chili`.
2. Replace every value in the copy. Delete optional lines you do not need.
3. Run `pnpm verify`. If anything in the file is wrong, the build fails and names the file and each bad field.
4. Commit the file on a branch and open a pull request.

Only publish a recipe after it has been cooked and tested.

## Fields

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | The recipe name. |
| `slug` | Yes | Must match the file name without `.md`. |
| `summary` | Yes | One sentence, shown on the cards and in link previews. |
| `date` | Yes | Publish date as YYYY-MM-DD. The index lists newest first. |
| `servings` | Yes | A whole number. |
| `servingsNote` | No | A short note under the servings, such as "Double everything for two." |
| `prepMinutes`, `cookMinutes`, `totalMinutes` | Yes | Whole numbers of minutes. |
| `tags` | Yes | A list, such as `[high-protein, meal-prep, beef]`. |
| `image` | No | A path under `public/` (starting with `/`) or an https link. |
| `ingredients` | Yes | A list of groups. Each group has an optional `name` and a list of `items`. |
| `steps` | Yes | A list. Each step has a `title`, optional `minutes`, and `text`. |
| `tips` | No | A list. Each tip has an optional `title` and `text`. |
| `nutrition` | Yes | Per serving: `calories`, `protein`, `carbs`, `fat`, `fiber`, `estimate: true`, and an optional `note`. |

The text after the second `---` line is the chef's notes: plain paragraphs separated by a blank line. They show on the page but not when printed.

## Writing rules

- Put text values in double quotes. Without quotes, a line such as `1/2 onion: sliced` is read as a field name and value, and the build rejects it.
- Write full sentences, with no em dashes.
- Spell measurements the same way every time: tbsp, tsp, cup, oz, lb, °F.
- Nutrition numbers are estimates, and the page labels them that way.
- Use only original text and photos.
