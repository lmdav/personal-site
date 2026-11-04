// The rice-bowl foods in the ingredient kit: a steak (whole and in strips), broccoli,
// avocado slices, a fried egg, a bed of rice, and sesame seeds, at real size in meters and
// centered on the colliders the bake uses (src/recipes/*.build.json). The steak's crust is
// the real crust photo; the rest is modeled and painted. Built on first use, so a recipe
// that needs none of them pays nothing.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "../geo";

function canvasTexture(w: number, h: number, seed: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function dabs(g: CanvasRenderingContext2D, r: () => number, n: number, w: number, h: number, colors: string[], min: number, max: number, alpha = 0.5) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[Math.floor(r() * colors.length)];
    g.globalAlpha = alpha * (0.4 + r() * 0.6);
    g.beginPath();
    g.ellipse(r() * w, r() * h, min + r() * (max - min), min + r() * (max - min), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

/** A copy of a mapped material that can fade in from another map: at done 0 it shows
 * rawMap, at done 1 its own map. */
export function cookableMap<M extends THREE.MeshStandardMaterial>(material: M, rawMap: THREE.Texture) {
  const m = material.clone() as M;
  const uniforms = { uDone: { value: 1 }, uRawMap: { value: rawMap } };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = `uniform float uDone;\nuniform sampler2D uRawMap;\n${shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      diffuseColor.rgb = mix(texture2D(uRawMap, vMapUv).rgb, diffuseColor.rgb, clamp(uDone, 0.0, 1.0));`,
    )}`;
  };
  m.customProgramCacheKey = () => "cookableMap";
  return {
    material: m,
    done(d: number) {
      uniforms.uDone.value = d;
      return m;
    },
  };
}

/* Steak ------------------------------------------------------------- */

export const STEAK = { length: 0.112, depth: 0.062, height: 0.024, strip: 0.0065 };

/** A strip's cut face: pink in the middle, a gray-brown band and dark crust along the two
 * seared sides, and the fat cap at one end. */
const stripFace = () =>
  canvasTexture(512, 192, 141, (g, r) => {
    g.fillStyle = "#C96F6C";
    g.fillRect(0, 0, 512, 192);
    g.filter = "blur(10px)";
    dabs(g, r, 60, 512, 192, ["#BE5C5E", "#D88A82", "#C9716C", "#B4524F"], 10, 34, 0.5);
    g.filter = "none";
    dabs(g, r, 900, 512, 192, ["#A9504F", "#E2A49A", "#B9605C", "#EFBDB0"], 0.8, 2.6, 0.32);
    // from the seared sides in: dark crust, a thin gray-brown band, then the pink
    for (const [from, to] of [[0, 54], [192, 138]]) {
      const band = g.createLinearGradient(0, from, 0, to);
      band.addColorStop(0, "rgba(44, 24, 12, 1)");
      band.addColorStop(0.14, "rgba(84, 50, 30, 1)");
      band.addColorStop(0.42, "rgba(146, 100, 78, 0.9)");
      band.addColorStop(1, "rgba(170, 110, 95, 0)");
      g.fillStyle = band;
      g.fillRect(0, Math.min(from, to), 512, 54);
    }
    const fat = g.createLinearGradient(486, 0, 512, 0);
    fat.addColorStop(0, "rgba(226, 196, 150, 0)");
    fat.addColorStop(0.4, "rgba(222, 188, 138, 0.95)");
    fat.addColorStop(1, "rgba(142, 92, 48, 1)");
    g.fillStyle = fat;
    g.fillRect(486, 0, 26, 192);
  });

/** One strip, cut 1/4 inch or so from the steak, lying with a cut face up. */
function stripGeometry(seed: number) {
  const r = rng(seed);
  const geo = new RoundedBoxGeometry(STEAK.depth, STEAK.strip, STEAK.height, 5, 0.0022);
  const pos = geo.attributes.position;
  const [arch, twist, ph, ph2, taper] = [(r() - 0.5) * 0.005, (r() - 0.5) * 0.06, r() * 6, r() * 6, (r() - 0.5) * 0.22];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (STEAK.depth / 2);
    const z = pos.getZ(i);
    const edge = Math.abs(z) / (STEAK.height / 2);
    // a real slice is uneven: wider one way, wavy along its seared edges, and a little bent
    pos.setY(i, pos.getY(i) + arch * (1 - x * x) + twist * x * z + 0.0005 * Math.sin(x * 7 + ph));
    pos.setZ(i, z * (1 + taper * x) + edge * Math.sign(z) * (0.0012 * Math.sin(x * 9 + ph) + 0.0007 * Math.sin(x * 23 + ph2)));
    pos.setX(i, pos.getX(i) * (1 + 0.04 * Math.sin((z / STEAK.height) * 9 + ph2)));
  }
  return geo;
}

/** The whole steak's outline, as a strip steak: nearly square corners, one long edge the fat
 * cap. UVs are a straight projection from above. */
function wholeSteakGeometry() {
  const { length: l, depth: d, height: h } = STEAK;
  const shape = new THREE.Shape();
  const n = 80;
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k4 = (Math.abs(c) ** 4 + Math.abs(s) ** 4) ** -0.25; // a rounded rectangle
    const x = (l / 2) * c * k4 * (1 + 0.02 * Math.sin(a * 3));
    const y = (d / 2) * s * k4 * (1 + 0.03 * Math.sin(a * 2 + 1));
    if (k === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h - 0.004, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 3, curveSegments: 12 });
  geo.rotateX(-Math.PI / 2);
  geo.center();
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (l * 1.06) + 0.5, pos.getZ(i) / (d * 1.06) + 0.5);
  return geo;
}

// Rows of the 256-row steak textures: the trimmed fat cap is a thin band along one long edge.
const WALL_ROWS = 6;
const FAT_ROWS = 22; // how many rows of the 256-row steak textures are the fat cap

const rawSteak = () =>
  canvasTexture(512, 256, 142, (g, r) => {
    g.fillStyle = "#A92D33";
    g.fillRect(0, 0, 512, 256);
    dabs(g, r, 500, 512, 256, ["#8E2028", "#BC3D40", "#C9524F"], 3, 16, 0.4);
    g.strokeStyle = "#EBD3BF";
    for (let i = 0; i < 70; i++) {
      let [x, y] = [r() * 512, r() * 256];
      g.globalAlpha = 0.3 + r() * 0.4;
      g.lineWidth = 0.8 + r() * 1.8;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) g.lineTo((x += (r() - 0.3) * 26), (y += (r() - 0.5) * 16));
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = "#E8D2B6";
    g.fillRect(0, WALL_ROWS, 512, FAT_ROWS - WALL_ROWS);
    g.fillStyle = "#A63A3E";
    g.fillRect(0, 0, 512, WALL_ROWS);
  });

const searedSteak = (crust: THREE.Texture) =>
  canvasTexture(512, 256, 143, (g, r) => {
    // the crust photo, softened over a dark sear so it reads as crust and not as wood grain
    g.fillStyle = "#3E2010";
    g.fillRect(0, 0, 512, 256);
    g.globalAlpha = 0.5;
    g.filter = "blur(1.5px)";
    g.drawImage(crust.image as CanvasImageSource, 0, 0, 512, 256);
    g.filter = "none";
    g.globalAlpha = 1;
    dabs(g, r, 160, 512, 256, ["#1E0F07", "#2C160A", "#5B3218"], 3, 14, 0.35);
    const fat = g.createLinearGradient(0, WALL_ROWS, 0, FAT_ROWS + 6);
    fat.addColorStop(0, "#8E5A2C");
    fat.addColorStop(0.7, "#B98346");
    fat.addColorStop(1, "rgba(150, 96, 50, 0)");
    g.fillStyle = fat;
    g.fillRect(0, WALL_ROWS, 512, FAT_ROWS - WALL_ROWS + 6);
    g.fillStyle = "#4A2A16";
    g.fillRect(0, 0, 512, WALL_ROWS);
  });

/* Broccoli ---------------------------------------------------------- */

/** A small floret: a pale, tapered stem and a crown of hundreds of tiny buds on a few lobes,
 * in vertex colors, with a char weight per bud so the tips blacken first. */
function floretGeometry(seed: number) {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const add = (geo: THREE.BufferGeometry, color: THREE.Color, char: number) => {
    const count = geo.attributes.position.count;
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(Array.from({ length: count }, () => [color.r, color.g, color.b]).flat()), 3));
    geo.setAttribute("aChar", new THREE.BufferAttribute(new Float32Array(count).fill(char), 1));
    geo.deleteAttribute("uv");
    parts.push(geo.index ? geo.toNonIndexed() : geo);
  };
  const lean = (r() - 0.5) * 0.25;
  const stem = new THREE.CylinderGeometry(0.0075, 0.0062, 0.017, 20, 3);
  stem.rotateZ(lean);
  stem.translate(0, 0.0125, 0);
  add(stem, new THREE.Color("#8FAB5E"), 0.2);
  const buds = new THREE.IcosahedronGeometry(1, 1);
  const lobes = 6;
  const shades = ["#2F5A22", "#3B6B29", "#477831", "#2A5024", "#55853A"].map((c) => new THREE.Color(c));
  const top = new THREE.Vector3(Math.sin(lean) * -0.014, 0.028, 0);
  for (let l = 0; l < lobes; l++) {
    const a = (l / lobes) * Math.PI * 2 + r();
    const out = l === 0 ? 0 : 0.0105;
    const c = top.clone().add(new THREE.Vector3(Math.cos(a) * out, l === 0 ? 0.004 : -0.0015 + r() * 0.003, Math.sin(a) * out));
    const R = 0.0088 + r() * 0.0016;
    const under = new THREE.SphereGeometry(R * 0.93, 12, 8);
    under.translate(c.x, c.y, c.z);
    add(under, new THREE.Color("#1F3F18"), 0.3);
    for (let k = 0; k < 74; k++) {
      // bud positions spread evenly over the lobe's upper dome
      const y = 1 - (k + 0.5) / 74;
      const ring = Math.sqrt(1 - y * y * 0.98);
      const t = k * 2.39996 + l;
      const b = buds.clone();
      const s = 0.0014 + r() * 0.0009;
      b.scale(s, s, s);
      b.translate(c.x + Math.cos(t) * ring * R, c.y + y * R * 0.92 + r() * 0.0005, c.z + Math.sin(t) * ring * R);
      add(b, shades[Math.floor(r() * shades.length)], Math.min(1, y * 0.75 + r() * 0.5));
    }
  }
  const geo = mergeGeometries(parts)!;
  geo.center();
  return geo;
}

/** The floret's material. done runs from raw (bright, just cut) to steamed and charred. */
export function broccoliMaterial() {
  const uniforms = { uDone: { value: 1 } };
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute float aChar;\nvarying float vChar;\n${shader.vertexShader.replace("#include <color_vertex>", "#include <color_vertex>\nvChar = aChar;")}`;
    shader.fragmentShader = `uniform float uDone;\nvarying float vChar;\n${shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec3 bright = diffuseColor.rgb * vec3(1.12, 1.28, 0.9);
      vec3 charred = mix(diffuseColor.rgb, vec3(0.03, 0.024, 0.016), 0.9 * smoothstep(0.6, 0.98, vChar));
      diffuseColor.rgb = mix(bright, charred, clamp(uDone, 0.0, 1.0));`,
    )}`;
  };
  material.customProgramCacheKey = () => "broccoli";
  return {
    material,
    done(d: number) {
      uniforms.uDone.value = d;
      return material;
    },
  };
}

/* Avocado ----------------------------------------------------------- */

const AVOCADO = { length: 0.074, width: 0.024, thick: 0.0075 };

/** A slice from a half: a crescent with a rounded edge, built as a grid across its width so
 * the paint runs evenly from the dark rim (v = 1) to the pale inside (v = 0). */
function avocadoGeometry() {
  const { length: L, width: W, thick: T } = AVOCADO;
  const along = 40;
  const across = 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const row = across * 2 + 1; // over the top from inside to rim, then back underneath
  for (let i = 0; i <= along; i++) {
    const t = i / along;
    const outer = W * Math.sin(Math.PI * t) ** 0.62;
    const inner = outer * 0.5 * Math.sin(Math.PI * t) ** 0.4;
    for (let j = 0; j < row; j++) {
      const top = j <= across;
      const v = top ? j / across : (2 * across - j) / across;
      const round = Math.max(0, 1 - (2 * v - 1) ** 6) ** 0.5;
      positions.push(L * (t - 0.5), ((top ? 1 : -1) * T * round * Math.min(1, (outer - inner) / (W * 0.25) + 0.05)) / 2, -(inner + (outer - inner) * v));
      uvs.push(0.5, v);
    }
  }
  for (let i = 0; i < along; i++) {
    for (let j = 0; j < row; j++) {
      const [a, b, c, d] = [i * row + j, i * row + (j + 1) % row, (i + 1) * row + j, (i + 1) * row + (j + 1) % row];
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  geo.center();
  return geo;
}

const avocadoFlesh = () =>
  canvasTexture(64, 256, 144, (g, r) => {
    // v = 1 (row 0) is the rim that sat against the skin
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#6F8F33");
    grad.addColorStop(0.035, "#9DB84C");
    grad.addColorStop(0.14, "#CFD972");
    grad.addColorStop(0.42, "#EAE793");
    grad.addColorStop(1, "#F5F0B6");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 256);
    dabs(g, r, 80, 64, 256, ["#EEE69E", "#C9D36C"], 1, 3, 0.25);
  });

/* Fried egg --------------------------------------------------------- */

export const EGG = { radius: 0.034, yolk: 0.0135, yolkAt: [0.004, -0.002] as const };

/** The white of a fried egg: a thin, wavering pool, a little thicker around the yolk, with
 * an edge that drops to the pan. UVs are a straight projection from above. */
function eggWhiteGeometry(seed: number) {
  const r = rng(seed);
  const [a1, a2, a3] = [r() * 6, r() * 6, r() * 6];
  const rings = 22;
  const seg = 96;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  for (let j = 0; j <= rings + 1; j++) {
    const rho = Math.min(1, j / rings);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const R = EGG.radius * (1 + 0.09 * Math.sin(2 * a + a1) + 0.05 * Math.sin(3 * a + a2) + 0.02 * Math.sin(9 * a + a3));
      const y = j > rings ? 0 : 0.0036 * Math.max(0, 1 - rho ** 7) ** 0.5 + 0.0013 * Math.exp(-((rho / 0.45) ** 2));
      const [x, z] = [Math.cos(a) * rho * R, Math.sin(a) * rho * R];
      positions.push(x, y, z);
      uvs.push(x / (EGG.radius * 2.4) + 0.5, z / (EGG.radius * 2.4) + 0.5);
    }
  }
  for (let j = 0; j <= rings; j++) {
    for (let i = 0; i < seg; i++) {
      const p = j * (seg + 1) + i;
      index.push(p, p + 1, p + seg + 1, p + 1, p + seg + 2, p + seg + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

const eggWhite = (glazed: boolean) =>
  canvasTexture(512, 512, 145, (g, r) => {
    g.fillStyle = "#FBF7EC";
    g.fillRect(0, 0, 512, 512);
    dabs(g, r, 60, 512, 512, ["#F3EDDD", "#FFFDF6"], 8, 30, 0.5);
    const edge = g.createRadialGradient(256, 256, 150, 256, 256, 215);
    edge.addColorStop(0, "rgba(180, 130, 70, 0)");
    edge.addColorStop(1, glazed ? "rgba(112, 62, 22, 0.8)" : "rgba(200, 160, 100, 0.5)");
    g.fillStyle = edge;
    g.fillRect(0, 0, 512, 512);
    if (glazed) {
      // a soft amber wash where the sauce was spooned over, darkest toward the edge
      g.filter = "blur(16px)";
      dabs(g, r, 26, 512, 512, ["#B9783A", "#A5642A", "#C98E4C"], 18, 50, 0.3);
      g.filter = "none";
    }
  });

/* Rice -------------------------------------------------------------- */

/** One cooked grain of Calrose: plump and short. */
function grainGeometry() {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  geo.scale(0.0036, 0.0015, 0.00175);
  return geo;
}
const GRAIN_SHADES = ["#F4EFE0", "#FBF8EE", "#EDE6D2", "#F7F3E6"].map((c) => new THREE.Color(c));

/** Rice filling a bowl: a solid mass in the shape of the bake's collider (profile: [radius,
 * height] points), covered in instanced grains. Rays pass through the grains and hit the
 * mass, so sauce and seeds land on its surface. */
function riceBed(profile: number[][], count: number) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
  const mass = new THREE.LatheGeometry(pts, 64);
  mass.computeVertexNormals();
  const massMesh = new THREE.Mesh(mass, new THREE.MeshStandardMaterial({ color: "#F1ECDC", roughness: 0.75, side: THREE.DoubleSide }));
  massMesh.castShadow = massMesh.receiveShadow = true;
  const grains = new THREE.InstancedMesh(grainGeometry(), new THREE.MeshPhysicalMaterial({ roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4 }), count);
  const r = rng(146);
  // Spread by area along the profile, so the grains cover the mass evenly.
  // The top is what shows, so it gets most of them.
  const weights = pts.slice(1).map((p, i) => p.distanceTo(pts[i]) * (p.x + pts[i].x) * (p.x < pts[i].x ? 3 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  const o = new THREE.Object3D();
  const up = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    let pick = r() * total;
    let k = 0;
    while (k < weights.length - 1 && pick > weights[k]) pick -= weights[k++];
    const t = r();
    const [a, b] = [pts[k], pts[k + 1]];
    const rad = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const turn = r() * Math.PI * 2;
    // the profile runs up the outside, so its outward side is to the right of its direction
    up.set(b.y - a.y, -(b.x - a.x), 0).normalize();
    const n = new THREE.Vector3(up.x * Math.cos(turn), up.y, -up.x * Math.sin(turn));
    o.position.set(Math.cos(turn) * rad, y, -Math.sin(turn) * rad).addScaledVector(n, 0.0007 + r() * 0.0009);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    o.rotateY(r() * 6.3);
    o.rotateX((r() - 0.5) * 0.7);
    o.updateMatrix();
    grains.setMatrixAt(i, o.matrix);
    grains.setColorAt(i, GRAIN_SHADES[Math.floor(r() * GRAIN_SHADES.length)]);
  }
  grains.receiveShadow = true;
  grains.frustumCulled = false;
  grains.raycast = () => {};
  const group = new THREE.Group();
  group.add(massMesh, grains);
  return group;
}

/* Everything -------------------------------------------------------- */

export function buildFoods(crust: THREE.Texture) {
  const face = stripFace();
  crust.colorSpace = THREE.SRGBColorSpace;
  const crustSide = new THREE.MeshStandardMaterial({ map: crust, roughness: 0.5, color: "#8D6A52" });
  const cut = new THREE.MeshPhysicalMaterial({ map: face, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  const seared = new THREE.MeshPhysicalMaterial({ map: searedSteak(crust), bumpMap: crust, bumpScale: 1.2, roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const steakRaw = rawSteak();
  const whiteClean = eggWhite(false);
  const whiteGlazed = new THREE.MeshPhysicalMaterial({ map: eggWhite(true), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.14, side: THREE.DoubleSide });
  const flesh = avocadoFlesh();
  flesh.wrapS = THREE.ClampToEdgeWrapping;
  const sesame = new THREE.SphereGeometry(1, 8, 6);
  sesame.scale(0.00155, 0.00055, 0.001);
  return {
    steak: {
      whole: wholeSteakGeometry(),
      seared,
      /** The steak's top, from raw to seared. */
      searing: () => cookableMap(seared, steakRaw),
      /** Its sides: the extrusion's second material. */
      rawSide: new THREE.MeshStandardMaterial({ color: "#9E3438", roughness: 0.55 }),
      searedSide: new THREE.MeshStandardMaterial({ color: "#3A2012", roughness: 0.6 }),
      strips: [0, 1, 2, 3, 4, 5].map((i) => stripGeometry(150 + i)),
      /** Per box face: the two ends, the two cut faces, and the two seared sides. */
      stripMaterials: [crustSide, crustSide, cut, cut, crustSide, crustSide] as THREE.Material[],
    },
    broccoli: { geos: [0, 1, 2].map((i) => floretGeometry(160 + i)), cooked: broccoliMaterial(), proxy: new THREE.IcosahedronGeometry(0.019, 1), hidden: new THREE.MeshBasicMaterial() },
    avocado: { geo: avocadoGeometry(), material: new THREE.MeshPhysicalMaterial({ map: flesh, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, side: THREE.DoubleSide }), width: AVOCADO.width },
    egg: {
      whites: [0, 1].map((i) => eggWhiteGeometry(170 + i)),
      white: whiteGlazed,
      /** The white, from clean to glazed in teriyaki. */
      glazing: () => cookableMap(whiteGlazed, whiteClean),
      yolk: (() => {
        const g = new THREE.SphereGeometry(EGG.yolk, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        g.scale(1, 0.62, 1);
        return g;
      })(),
      yolkMaterial: new THREE.MeshPhysicalMaterial({ color: "#F0A11E", roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06 }),
    },
    grain: { geo: grainGeometry(), shades: GRAIN_SHADES },
    riceBed,
    sesame: { geo: sesame, material: new THREE.MeshStandardMaterial({ color: "#E9D7A9", roughness: 0.5 }) },
  };
}
