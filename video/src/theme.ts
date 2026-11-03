import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";

// Same palette and type as the blueprint drawings on the site.
export const BG = "#1B4A86";
export const INK = "#EEF4FB";
export const INK2 = "#A9C4E6";
export const GRID_MINOR = "#235390";
export const GRID_MAJOR = "#2C61A3";
export const RED = "#FFA08A";

export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const HAND = loadCaveat("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
