import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

// Cream drafting paper with navy ink and light blue shading (docs/recipes-media-v3.md).
export const PAPER = "#F3ECDD";
export const GRID = "#E4D8C1";
export const INK = "#1D3557";
export const INK2 = "#6E819B";
export const TOP = "#DDE7F1";
export const SIDE = "#B7C8DC";
export const DEEP = "#8FA6C2";
export const SHADE = "#C9BFA9";
export const ACCENT = "#D4553A";

export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const HAND = loadCaveat("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
