import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep in sync with REMOTE_IMAGE_HOSTS in lib/site.ts (a test checks this).
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/**" }],
  },
};

export default nextConfig;
