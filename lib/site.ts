/** The live site's origin. Used for absolute URLs in metadata and JSON-LD. */
export const SITE_URL = "https://lmdav.com";

/**
 * Hosts that recipe photos may be loaded from. next.config.ts allows the
 * same hosts for image optimization, and a test keeps the two in sync.
 */
export const REMOTE_IMAGE_HOSTS = ["images.unsplash.com"];
