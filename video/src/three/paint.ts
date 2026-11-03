// Small surface textures painted on a canvas, for food too small to need a photo.
// The random numbers are seeded, so every render paints the same seeds and specks.
import * as THREE from "three";
import { rng } from "../geo";

function paint(size: number, seed: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function specks(g: CanvasRenderingContext2D, r: () => number, n: number, colors: string[], min: number, max: number, size: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.globalAlpha = 0.2 + r() * 0.5;
    g.beginPath();
    g.ellipse(r() * size, r() * size, min + r() * (max - min), min + r() * (max - min), r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** Cut tomato flesh: red walls, lighter pulp, and a few seeds in jelly. */
export const tomatoTexture = () =>
  paint(256, 21, (g, r) => {
    g.fillStyle = "#C3311C";
    g.fillRect(0, 0, 256, 256);
    specks(g, r, 60, ["#D9472C", "#A8240F", "#E2603F"], 10, 40, 256);
    specks(g, r, 25, ["#E9846A", "#F09A7C"], 12, 30, 256);
    specks(g, r, 30, ["#F3D58E", "#EAC779"], 2, 5, 256);
  });

/** A dill pickle chip seen from above: green skin, pale flesh, a ring of seeds. */
export const pickleTexture = () =>
  paint(256, 22, (g, r) => {
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "#C9CD82");
    grad.addColorStop(0.7, "#B4BD63");
    grad.addColorStop(0.86, "#8A9A3C");
    grad.addColorStop(0.92, "#4D6420");
    grad.addColorStop(1, "#3C5118");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + r() * 0.3;
      const d = 42 + r() * 14;
      g.fillStyle = "rgba(236, 232, 190, 0.8)";
      g.beginPath();
      g.ellipse(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 7, 4, a, 0, Math.PI * 2);
      g.fill();
    }
    specks(g, r, 80, ["#9DAA4C", "#D3D493"], 2, 6, 256);
  });

/** A browned mushroom slice. The canvas matches the unit slice outline in mushroomShape. */
export const mushroomTexture = (outline: (g: CanvasRenderingContext2D) => void) =>
  paint(512, 23, (g, r) => {
    g.fillStyle = "#4E2C15";
    g.fillRect(0, 0, 512, 512);
    g.save();
    outline(g);
    g.clip();
    const grad = g.createRadialGradient(256, 250, 30, 256, 250, 260);
    grad.addColorStop(0, "#BF976B");
    grad.addColorStop(0.5, "#9E6F47");
    grad.addColorStop(0.8, "#734629");
    grad.addColorStop(1, "#4A2912");
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 512);
    // the gills under the cap, a fan of fine dark lines
    g.strokeStyle = "rgba(90, 55, 30, 0.35)";
    g.lineWidth = 2;
    for (let i = -10; i <= 10; i++) {
      g.beginPath();
      g.moveTo(256 + i * 6, 262);
      g.lineTo(256 + i * 22, 262 - 40 - r() * 20);
      g.stroke();
    }
    specks(g, r, 220, ["#7A4B28", "#9C6B40", "#5A3418"], 2, 9, 512);
    g.restore();
  });

/** Raw ground beef: pink-red with streaks of fat and darker crumbs. */
export const beefTexture = () =>
  paint(256, 24, (g, r) => {
    g.fillStyle = "#B4434A";
    g.fillRect(0, 0, 256, 256);
    specks(g, r, 260, ["#C8555A", "#9A3039", "#D46A6C", "#8A2731"], 2, 7, 256);
    specks(g, r, 90, ["#EBC9C2", "#F2D9D2"], 1, 4, 256);
  });

/** Yukon Gold skin: thin golden-tan skin with darker freckles and a few eyes. */
export const potatoSkinTexture = () =>
  paint(256, 25, (g, r) => {
    g.fillStyle = "#CDA563";
    g.fillRect(0, 0, 256, 256);
    specks(g, r, 90, ["#DDBC7C", "#B98F4F", "#C69D5C", "#A88044"], 8, 34, 256);
    specks(g, r, 260, ["#7E5C30", "#946E3E", "#6B4C26"], 0.6, 2.2, 256);
    specks(g, r, 10, ["#5E4322"], 2.5, 5, 256);
  });

/** The sauce before it is stirred: white yogurt with ribbons of ketchup, mustard, and
 * paprika folded through it. */
export const swirlTexture = () =>
  paint(512, 26, (g, r) => {
    g.fillStyle = "#F4EFE6";
    g.fillRect(0, 0, 512, 512);
    const ribbons = ["#C0392B", "#E2B12C", "#D9826A", "#C0392B", "#E2B12C", "#EAD9A8"];
    ribbons.forEach((color, k) => {
      g.strokeStyle = color;
      g.globalAlpha = 0.75;
      g.lineWidth = 10 + r() * 14;
      g.lineCap = "round";
      g.beginPath();
      const a0 = r() * Math.PI * 2;
      for (let t = 0; t <= 1; t += 0.02) {
        const a = a0 + t * Math.PI * (2.5 + k * 0.3);
        const d = 40 + t * 170 + 10 * Math.sin(t * 20 + k);
        const x = 256 + Math.cos(a) * d;
        const y = 256 + Math.sin(a) * d;
        if (t === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    });
    g.globalAlpha = 1;
    specks(g, r, 120, ["#B5432A", "#8DA243", "#E8E0CC"], 1, 3, 512);
  });
