import type { NextConfig } from "next";
import { versionRedirects } from "./lib/recipes.ts";

const nextConfig: NextConfig = {
  images: {
    // Keep in sync with REMOTE_IMAGE_HOSTS in lib/site.ts (a test checks this).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
  // A recipe that became a version of another one (variantOf) keeps its old address
  // working: it opens the main recipe with that version chosen.
  async redirects() {
    return versionRedirects();
  },
};

export default nextConfig;
