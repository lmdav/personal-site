// Bakes the bowl build with Rapier physics, from src/recipes/<slug>.build.json.
// Pass 1 drops every ingredient into the real bowl mesh in build order, which gives a
// natural resting arrangement. The pulled-apart pose is that arrangement lifted layer by
// layer. Pass 2 drops the lifted layers back in and records every item's transform 60
// times a second, so the 30 fps video plays the drop in 2x slow motion. The result goes
// to src/data/<slug>.drop.json, and every render plays back exactly the same motion.
// Usage: node tools/bake-drop.mjs [slug]
import RAPIER from "@dimforge/rapier3d-compat";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] ?? "smash-burger-bowl";
const spec = JSON.parse(readFileSync(path.join(root, "src", "recipes", `${slug}.build.json`), "utf8"));
await RAPIER.init();

const RATE = 60; // samples per second of simulated time
const SUBSTEPS = 4;
const LAYER_GAP = 10; // samples between layers when they drop back in
const DROP_SAMPLES = 150;

// Deterministic random numbers.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const spread = (center, half) => center + (rand() - 0.5) * 2 * half;

/** The bowl's triangles: its profile turned on a lathe, the same way three.js's
 * LatheGeometry builds the bowl the scene draws. */
function latheMesh({ profile, segments }) {
  const positions = [];
  const indices = [];
  const n = profile.length;
  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI * 2;
    for (const [r, y] of profile) positions.push(r * Math.sin(phi), y, r * Math.cos(phi));
  }
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j;
      const b = a + n;
      indices.push(a, b, a + 1, b + 1, a + 1, b);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}
const bowl = latheMesh(spec.bowl);

function makeWorld() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / (RATE * SUBSTEPS);
  world.createCollider(RAPIER.ColliderDesc.trimesh(bowl.positions, bowl.indices).setFriction(0.8));
  world.createCollider(RAPIER.ColliderDesc.cuboid(2, 0.01, 2).setTranslation(0, -0.01, 0));
  return world;
}

function addBody(world, item, pos, rot, dynamic) {
  const kind = spec.kinds[item.kind];
  const desc = dynamic ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.kinematicPositionBased();
  const body = world.createRigidBody(desc.setTranslation(pos.x, pos.y, pos.z).setRotation(rot).setCcdEnabled(true).setLinearDamping(0.4).setAngularDamping(kind.angularDamping ?? 1.5));
  const shape = kind.box ? RAPIER.ColliderDesc.cuboid(...kind.box) : RAPIER.ColliderDesc.cylinder(kind.cylinder[0], kind.cylinder[1]);
  world.createCollider(shape.setDensity(kind.density ?? 1000).setFriction(kind.friction ?? 0.8).setRestitution(kind.restitution ?? 0.03), body);
  return body;
}

function yawTilt(tilt) {
  const ax = (rand() - 0.5) * tilt;
  const ay = rand() * Math.PI * 2;
  const az = (rand() - 0.5) * tilt;
  const c1 = Math.cos(ax / 2), c2 = Math.cos(ay / 2), c3 = Math.cos(az / 2);
  const s1 = Math.sin(ax / 2), s2 = Math.sin(ay / 2), s3 = Math.sin(az / 2);
  return { x: s1 * c2 * c3 + c1 * s2 * s3, y: c1 * s2 * c3 - s1 * c2 * s3, z: c1 * c2 * s3 + s1 * s2 * c3, w: c1 * c2 * c3 - s1 * s2 * s3 };
}

const step = (world) => {
  for (let s = 0; s < SUBSTEPS; s++) world.step();
};
const pose = (body) => {
  const t = body.translation();
  const r = body.rotation();
  return [t.x, t.y, t.z, r.x, r.y, r.z, r.w];
};

// Every ingredient piece, in build order.
const items = [];
spec.layers.forEach((layer, li) => {
  for (const group of layer.items) {
    const variants = items.filter((it) => it.kind === group.kind).length;
    for (let k = 0; k < group.count; k++) items.push({ layer: li, kind: group.kind, variant: variants + k, zone: group.zone, spot: group.spots?.[k] });
  }
});

const outside = (p) => Math.hypot(p[0], p[2]) > spec.bowl.rim - 0.01 || p[1] < 0.005;

// Pass 1: fill the bowl by dropping pieces in one at a time from just above the pile.
// A piece that bounces out is dropped again nearer the middle of its zone.
const world1 = makeWorld();
const built = [];
const drop = (item, narrow) => {
  const top = Math.max(0.1, ...built.filter(Boolean).map((b) => b.translation().y + 0.03));
  const [cx, cz, hx, hz] = item.spot ? [...item.spot, 0.004, 0.004] : item.zone;
  return addBody(world1, item, { x: spread(cx, hx * narrow), y: top + rand() * 0.01, z: spread(cz, hz * narrow) }, yawTilt(0.5), true);
};
for (const item of items) {
  built.push(drop(item, 1));
  for (let s = 0; s < 3; s++) step(world1);
}
for (let s = 0; s < RATE * 2; s++) step(world1);
for (let tries = 0; tries < 5; tries++) {
  const out = built.map((b, i) => (outside(pose(b)) ? i : -1)).filter((i) => i >= 0);
  if (!out.length) break;
  for (const i of out) {
    world1.removeRigidBody(built[i]);
    built[i] = null;
    built[i] = drop(items[i], 0.4);
    for (let s = 0; s < 3; s++) step(world1);
  }
  for (let s = 0; s < RATE * 2; s++) step(world1);
}
const rest = built.map(pose);

/** Turns a resting rotation most of the way to flat, keeping which way the piece faces. */
function level([x, y, z, w], amount) {
  // the piece's up axis in the world, and the shortest turn that points it straight up
  let ux = 2 * (x * y - w * z);
  let uy = 1 - 2 * (x * x + z * z);
  let uz = 2 * (y * z + w * x);
  if (uy < 0) [ux, uy, uz] = [-ux, -uy, -uz];
  const half = Math.acos(Math.min(1, uy)) * amount * 0.5;
  const len = Math.hypot(uz, ux) || 1;
  const [ax, az] = [-uz / len, ux / len]; // up x world up
  const s = Math.sin(half);
  const t = [ax * s, 0, az * s, Math.cos(half)];
  // t * q
  return [
    t[3] * x + t[0] * w + t[1] * z - t[2] * y,
    t[3] * y - t[0] * z + t[1] * w + t[2] * x,
    t[3] * z + t[0] * y - t[1] * x + t[2] * w,
    t[3] * w - t[0] * x - t[1] * y - t[2] * z,
  ];
}

// The pulled-apart pose: each layer lifted so its lowest piece floats at the layer's lift.
const lifted = rest.map((p, i) => {
  const layer = items[i].layer;
  const lowest = Math.min(...rest.filter((_, j) => items[j].layer === layer).map((q) => q[1]));
  const rot = spec.kinds[items[i].kind].level ? level(p.slice(3), 0.85) : p.slice(3);
  return [p[0], p[1] + spec.layers[layer].lift - lowest, p[2], ...rot];
});

// Pass 2: drop the lifted layers back in, bottom layer first, and record it. The small
// random spin at release varies by attempt; the first attempt that keeps every piece in
// the bowl wins.
const release = items.map((it, i) => it.layer * LAYER_GAP + (i % 3));
function dropBack() {
  const world = makeWorld();
  const bodies = lifted.map((p, i) => addBody(world, items[i], { x: p[0], y: p[1], z: p[2] }, { x: p[3], y: p[4], z: p[5], w: p[6] }, false));
  const frames = [];
  for (let f = 0; f < DROP_SAMPLES; f++) {
    bodies.forEach((body, i) => {
      if (f === release[i]) {
        body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
        const spin = 1.5 * (spec.kinds[items[i].kind].spin ?? 1);
        body.setAngvel({ x: (rand() - 0.5) * spin, y: (rand() - 0.5) * spin, z: (rand() - 0.5) * spin }, true);
      }
    });
    frames.push(bodies.map((b) => pose(b).map((v) => Math.round(v * 1e5) / 1e5)));
    step(world);
  }
  const moving = bodies.filter((b) => Math.hypot(...Object.values(b.linvel())) > 0.01).length;
  return { frames, moving, escaped: frames.at(-1).filter(outside).length };
}
let attempt = 0;
let best = dropBack();
while (best.escaped > 0 && ++attempt < 20) {
  const next = dropBack();
  if (next.escaped < best.escaped) best = next;
}
const { frames, moving, escaped } = best;

const out = path.join(root, "src", "data", `${slug}.drop.json`);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ rate: RATE, items: items.map(({ layer, kind, variant }, i) => ({ layer, kind, variant, release: release[i] })), frames }));

const last = frames.at(-1);
const drift = Math.max(...last.map((p, i) => Math.hypot(p[0] - rest[i][0], p[1] - rest[i][1], p[2] - rest[i][2])));
console.log(`Baked ${items.length} pieces, ${DROP_SAMPLES} samples, attempt ${attempt + 1}. Left the bowl: ${escaped}. Still moving: ${moving}. Largest change from pass 1: ${(drift * 100).toFixed(1)} cm.`);
const lost = frames.at(-1).map((p, i) => (outside(p) ? `${items[i].kind} ${i}` : null)).filter(Boolean);
if (lost.length) console.log(`Pieces that left the bowl: ${lost.join(", ")}`);
if (escaped || rest.some(outside)) process.exitCode = 1;
