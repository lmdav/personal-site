import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// House style: no em or en dashes anywhere in site copy, code, or docs.
const DASHES = /[\u2013\u2014]/;
const SCANNED = ["app", "components", "lib", "content", "docs", "scripts"];
const TEXT_FILE = /\.(tsx?|mjs|css|md)$/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return TEXT_FILE.test(name) ? [full] : [];
  });
}

test("no em or en dashes in site copy, code, or docs", () => {
  const hits = SCANNED.flatMap((dir) => files(path.join(process.cwd(), dir))).flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .map((line, i) => (DASHES.test(line) ? `${path.relative(process.cwd(), file)}:${i + 1}` : ""))
      .filter(Boolean),
  );
  assert.deepEqual(hits, []);
});
