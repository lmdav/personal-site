// Small geometry helpers for the hand-drawn 3D parts.

export type Pt = [number, number];

/** Vertical squash for surfaces seen from above at an angle (the "table" view). */
export const K = 0.5;

/** Deterministic random numbers, so every render draws the same crumbs and cracks. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v: number) => v.toFixed(1);

/** A smooth closed curve through the points (Catmull-Rom as cubic Beziers). */
export function smooth(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

/** A smooth open curve through the points. */
export function smoothOpen(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** Straight segments, for crisp crags and cut edges. */
export function poly(pts: Pt[], close = true): string {
  return "M" + pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" L") + (close ? "Z" : "");
}

/** Wobbly radii around a circle: amp for lumps, spikes for lacy bits. */
export function radii(r: () => number, n: number, amp: number, spikes = 0, passes = 2): number[] {
  let rs = Array.from({ length: n }, () => 1 + amp * (r() * 2 - 1));
  for (let p = 0; p < passes; p++) {
    rs = rs.map((v, i) => (rs[(i - 1 + n) % n] + 2 * v + rs[(i + 1) % n]) / 4);
  }
  if (spikes) rs = rs.map((v) => v + (r() < 0.28 ? spikes * r() : 0));
  return rs;
}

/** Points of a lumpy circle lying flat on the table. */
export function flatRing(cx: number, cy: number, rad: number, rs: number[]): Pt[] {
  const n = rs.length;
  return rs.map((k, i) => {
    const t = (2 * Math.PI * i) / n;
    return [cx + rad * k * Math.cos(t), cy + K * rad * k * Math.sin(t)] as Pt;
  });
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
