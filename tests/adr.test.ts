import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

// Architecture decision records: docs/adr/NNNN-slug.md, each with frontmatter whose id
// matches its file name and whose links point at real records and are returned.
const DIR = path.join(process.cwd(), "docs", "adr");
const LINKS = ["supersedes", "superseded_by", "amends", "amended_by", "related"] as const;
const PAIRS = [
  ["supersedes", "superseded_by"],
  ["amends", "amended_by"],
  ["related", "related"],
] as const;
const FIELDS = ["id", "title", "status", "date", ...LINKS];

type Adr = Record<(typeof LINKS)[number], string[]> & { id: string; file: string };

function load(): Adr[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const front = readFileSync(path.join(DIR, file), "utf8").match(/^---\n([\s\S]*?)\n---\n/);
      assert.ok(front, `${file} has no frontmatter`);
      const data = parseYaml(front[1]) as Record<string, unknown>;
      for (const field of FIELDS) assert.ok(field in data, `${file} is missing ${field}`);
      const ids = (v: unknown) => ((v as unknown[]) ?? []).map((x) => String(x).padStart(4, "0"));
      return { file, id: String(data.id).padStart(4, "0"), ...Object.fromEntries(LINKS.map((k) => [k, ids(data[k])])) } as Adr;
    });
}

test("every ADR's id matches its file name", () => {
  for (const adr of load()) assert.match(adr.file, new RegExp(`^${adr.id}-[a-z0-9-]+\\.md$`), `${adr.file} has id ${adr.id}`);
});

test("ADR links point at real records and are returned", () => {
  const adrs = load();
  const byId = new Map(adrs.map((a) => [a.id, a]));
  const problems: string[] = [];
  for (const adr of adrs) {
    for (const [there, back] of PAIRS) {
      for (const id of adr[there]) {
        const other = byId.get(id);
        if (!other) problems.push(`${adr.id} ${there} ${id}, which does not exist`);
        else if (!other[back].includes(adr.id)) problems.push(`${adr.id} ${there} ${id}, but ${id} has no ${back} ${adr.id}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
