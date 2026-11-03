import { test } from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";
import { REMOTE_IMAGE_HOSTS } from "../lib/site.ts";

test("next.config allows exactly the image hosts that recipes may use", () => {
  const hosts = (nextConfig.images?.remotePatterns ?? []).map((p) =>
    p instanceof URL ? p.hostname : p.hostname,
  );
  assert.deepEqual(hosts.sort(), [...REMOTE_IMAGE_HOSTS].sort());
});
