import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { CI_EXCUSES, GATES } from "../scripts/verify.mjs";

const WORKFLOWS = path.join(process.cwd(), ".github", "workflows");

test("every CI job is mirrored by a local verify gate or has a written excuse", () => {
  if (!existsSync(WORKFLOWS)) return;
  const local = new Set([...GATES.map((g) => g.name), ...Object.keys(CI_EXCUSES)]);
  const unmatched = readdirSync(WORKFLOWS)
    .filter((f) => /\.ya?ml$/.test(f))
    .flatMap((f) => {
      const workflow = parseYaml(readFileSync(path.join(WORKFLOWS, f), "utf8"));
      return Object.keys(workflow?.jobs ?? {}).map((job) => `${f}: ${job}`);
    })
    .filter((entry) => !local.has(entry.split(": ")[1]));
  assert.deepEqual(unmatched, [], "add these jobs to GATES or CI_EXCUSES in scripts/verify.mjs");
});

test("verify names each gate once", () => {
  const names = GATES.map((g) => g.name);
  assert.equal(new Set(names).size, names.length);
});
