import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";
import { REMOTE_IMAGE_HOSTS } from "../lib/site.ts";
import { versionRedirects } from "../lib/recipes.ts";

test("next.config allows exactly the image hosts that recipes may use", () => {
  const hosts = (nextConfig.images?.remotePatterns ?? []).map((p) =>
    p instanceof URL ? p.hostname : p.hostname,
  );
  assert.deepEqual(hosts.sort(), [...REMOTE_IMAGE_HOSTS].sort());
});

test("next.config sends every old version address to its main recipe", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];
  assert.deepEqual(redirects, versionRedirects());
  assert.ok(redirects.some((r) => r.source === "/recipes/smash-burger-bowl-sweet-potato" && r.destination === "/recipes/smash-burger-bowl?version=sweet-potato"));
});
