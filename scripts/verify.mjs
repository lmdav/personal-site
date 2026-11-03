#!/usr/bin/env node
/**
 * Runs every blocking gate, keeps going after a failure so one run reports
 * everything, and exits non-zero if any gate failed. Usage: `pnpm verify`.
 */
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Local gates. A CI job must map to one of these names or to CI_EXCUSES. */
export const GATES = [
  { name: "lint", cmd: ["pnpm", "lint"] },
  { name: "types", cmd: ["pnpm", "exec", "tsc", "--noEmit"] },
  { name: "test", cmd: ["pnpm", "test"] },
  // The build also validates every recipe file and fails on a bad one.
  { name: "build", cmd: ["pnpm", "build"] },
];

/** CI jobs with no local gate, each with the reason. Empty: the repo has no CI yet. */
export const CI_EXCUSES = {};

function run() {
  const results = GATES.map(({ name, cmd }) => {
    console.log(`\n=== ${name}: ${cmd.join(" ")}`);
    const { status, error } = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
    if (error) return { name, result: `SKIPPED (${error.message})` };
    return { name, result: status === 0 ? "PASS" : `FAIL (exit ${status})` };
  });

  console.log("\n=== verify summary");
  for (const r of results) console.log(`${r.result.padEnd(24)} ${r.name}`);
  process.exit(results.every((r) => r.result === "PASS") ? 0 : 1);
}

// Run only when executed directly (tests import GATES). Compare real paths so a
// symlinked invocation still runs the gates instead of silently passing.
const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : "";
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) run();
