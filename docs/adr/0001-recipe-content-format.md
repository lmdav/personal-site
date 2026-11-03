---
id: 0001
title: Recipes are Markdown files with validated YAML frontmatter
status: accepted
date: 2026-11-02
supersedes: []
superseded_by: []
amends: []
amended_by: []
related: [0002, 0003]
---

# 0001: Recipes are Markdown files with validated YAML frontmatter

## Context

The site needs a recipes section where adding a recipe means adding one file and changing no code. The site had no content system, database, or CMS. Each recipe page needs structured fields (times, servings, ingredient groups, steps, nutrition) for both the page template and schema.org JSON-LD, plus free-text chef's notes. Recipes are written by hand or pasted from chat, so mistakes such as a missing field or an unquoted colon have to be caught before they reach the live site.

## Decision

Each recipe is `content/recipes/<slug>.md`. The structured fields live in YAML frontmatter, and the body holds the chef's notes as plain paragraphs. `lib/recipes.ts` parses the frontmatter with the `yaml` package and validates it with a hand-written checker that collects every problem in a file and throws. Pages read recipes at build time, so a bad file fails `pnpm build` with the file name and each bad field. The checker rejects unknown fields, requires the slug to match the file name, and requires nutrition to be marked as an estimate. Files starting with `_` (the template) and `README.md` are skipped.

## Consequences

- One new runtime dependency, `yaml`, which has no dependencies of its own.
- The body is plain text, not Markdown. Formatting such as links or bold text in chef's notes would need a Markdown renderer later.
- Every recipe page is static and rebuilt on deploy. There is no editing interface; changes go through git.
- The validation is code in the repo with tests, rather than a schema library, so its error messages are written for a person editing the file.

## Alternatives

- **MDX:** allows components inside recipes, but adds a compiler and lets content files run code. Nothing in the recipes needs that.
- **TypeScript data files:** typed for free, but adding a recipe would also mean editing an import list, and the files are harder for a non-developer to edit.
- **JSON files:** no parser dependency, but hand-editing JSON is error-prone and it cannot hold prose comfortably.
- **A headless CMS or database:** a paid service or new infrastructure for a handful of recipes, which the project guardrails rule out without approval.
