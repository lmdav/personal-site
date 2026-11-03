// Turns a photo cutout of a piece of food into a solid 3D piece: the outline is traced
// from the cutout's transparency, the top domes up from the edge, light and dark in the
// photo become small bumps, and the photo itself is the surface.
import * as THREE from "three";

export type ReliefOptions = {
  /** Samples across the image. */
  grid: number;
  /** Meters across the longest side of the traced outline. */
  size: number;
  /** Height of the top surface in the middle, in meters. */
  top: number;
  /** Depth of the underside in the middle, in meters. */
  bottom: number;
  /** How far in from the outline the surface takes to round off, as a fraction of size. */
  edge: number;
  /** Meters of height from the photo's light and dark. */
  relief: number;
};

export function reliefGeometry(image: CanvasImageSource, o: ReliefOptions) {
  const n = o.grid + 1;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = n;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(image, 0, 0, n, n);
  const px = g.getImageData(0, 0, n, n).data;

  const inside = new Uint8Array(n * n);
  const lum = new Float32Array(n * n);
  let count = 0;
  let lumSum = 0;
  let sx = 0;
  let sy = 0;
  let minX = n;
  let maxX = 0;
  let minY = n;
  let maxY = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (px[i * 4 + 3] < 128) continue;
      inside[i] = 1;
      lum[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
      lumSum += lum[i];
      count++;
      sx += x;
      sy += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const meanLum = lumSum / count;

  // Distance from every sample to the outline, in samples (a two-pass chamfer).
  const dist = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) dist[i] = inside[i] ? 1e6 : 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : dist[y * n + x]);
  const D = Math.SQRT2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + D, at(x + 1, y - 1) + D);
    }
  }
  for (let y = n - 1; y >= 0; y--) {
    for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + D, at(x - 1, y + 1) + D);
    }
  }

  const cell = o.size / Math.max(maxX - minX, maxY - minY, 1);
  const cx = sx / count;
  const cy = sy / count;
  const edge = (o.edge * o.size) / cell;
  const V = n * n;
  const positions = new Float32Array(V * 6);
  const uvs = new Float32Array(V * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      const t = Math.min(1, dist[i] / edge);
      const round = Math.sqrt(t * (2 - t));
      const X = (x - cx) * cell;
      const Z = (y - cy) * cell;
      const bump = o.relief * (lum[i] - meanLum) * t;
      positions.set([X, o.top * round + bump, Z], i * 3);
      positions.set([X, -o.bottom * round, Z], (V + i) * 3);
      const u = x / (n - 1);
      const v = 1 - y / (n - 1);
      uvs.set([u, v], i * 2);
      uvs.set([u, v], (V + i) * 2);
    }
  }

  // Faces: a quad wherever all four corners are inside the outline, top and underside,
  // and a wall along every quad edge that faces the outside.
  const quad = (x: number, y: number) => x >= 0 && y >= 0 && x < n - 1 && y < n - 1 && inside[y * n + x] && inside[y * n + x + 1] && inside[(y + 1) * n + x] && inside[(y + 1) * n + x + 1];
  const index: number[] = [];
  const wall = (p: number, q: number) => index.push(p, q, V + p, q, V + q, V + p);
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      if (!quad(x, y)) continue;
      const a = y * n + x;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
      index.push(V + a, V + b, V + c, V + b, V + d, V + c);
      if (!quad(x, y - 1)) wall(a, b);
      if (!quad(x, y + 1)) wall(d, c);
      if (!quad(x + 1, y)) wall(b, d);
      if (!quad(x - 1, y)) wall(c, a);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}
