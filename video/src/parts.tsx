// The recipe's ingredients and tools as 3D drawings in one consistent style.
// Each part takes state props (smash, melt, flatten, crisp...) so scenes can
// animate it. Every part is drawn around (x, y), the point where it sits on the table.
import type { ReactNode } from "react";
import { K, clamp01, flatRing, lerp, poly, radii, rng, smooth, smoothOpen, type Pt } from "./geo";
import { ACCENT, DEEP, INK, INK2, MONO, PAPER, SHADE, SIDE, TOP } from "./theme";

const f = (v: number) => v.toFixed(1);

/** Patterns every drawing uses. Put once inside each <svg>. */
export function Defs() {
  return (
    <defs>
      <pattern id="shadow" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="7" stroke={SHADE} strokeWidth="1.8" />
      </pattern>
      <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK2} strokeWidth="0.9" />
      </pattern>
      <pattern id="cheese" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
        <line x1="0" y1="0" x2="0" y2="9" stroke={INK2} strokeWidth="0.9" />
      </pattern>
      <pattern id="iron" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <line x1="0" y1="0" x2="0" y2="5" stroke={INK2} strokeWidth="0.7" />
      </pattern>
      <pattern id="paper-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="#E4D8C1" strokeWidth="1" />
      </pattern>
      <marker id="note-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 1L9 5L0 9z" fill={ACCENT} />
      </marker>
    </defs>
  );
}

function Shadow({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#shadow)" />;
}

/** An irregular disc with thickness: patties, potatoes, pickle chips. */
function Slab({ top, h, side = SIDE, face = TOP, stroke = 1.8, ribs = 5 }: { top: Pt[]; h: number; side?: string; face?: string; stroke?: number; ribs?: number }) {
  const n = top.length;
  const bottom = top.map(([x, y]) => [x, y + h] as Pt);
  const front = top.map((_, i) => i).filter((i) => Math.sin((2 * Math.PI * i) / n) >= -0.05);
  const band = [...front.map((i) => top[i]), ...front.slice().reverse().map((i) => bottom[i])];
  return (
    <g>
      <path d={smooth(bottom)} fill={side} stroke={INK} strokeWidth={stroke * 0.85} />
      <path d={poly(band)} fill={side} />
      {front
        .filter((_, k) => k % ribs === 0)
        .map((i) => (
          <path key={i} d={`M${f(top[i][0])},${f(top[i][1] + 2)} v${f(Math.max(h - 3, 0))}`} stroke={INK2} strokeWidth="0.7" />
        ))}
      <path d={smooth(top)} fill={face} stroke={INK} strokeWidth={stroke} strokeLinejoin="round" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Beef patty: a ball (smash 0) pressed into a lacy disc (smash 1)     */
/* ------------------------------------------------------------------ */

export function Patty({ x, y, r = 150, smash = 1, crust = 1, seed = 3 }: { x: number; y: number; r?: number; smash?: number; crust?: number; seed?: number }) {
  const rand = rng(seed);
  const rb = r * 0.4;
  if (smash < 0.15) {
    const squash = smash / 0.15;
    const rx = rb * (1 + 0.25 * squash);
    const ry = rb * (1 - 0.35 * squash);
    const cy = y - ry;
    const bits = Array.from({ length: 34 }, () => {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 0.8;
      return [x + rx * d * Math.cos(a), cy + ry * d * Math.sin(a), rand() * Math.PI] as const;
    });
    return (
      <g>
        <Shadow x={x + 6} y={y} rx={rx * 1.1} ry={rx * 0.35} />
        <ellipse cx={x} cy={cy} rx={rx} ry={ry} fill={TOP} stroke={INK} strokeWidth="1.8" />
        <path d={`M${f(x + rx * 0.2)},${f(cy + ry * 0.95)} A${f(rx)},${f(ry)} 0 0 0 ${f(x + rx * 0.98)},${f(cy + ry * 0.2)}`} fill="none" stroke={INK2} strokeWidth="6" opacity="0.35" />
        {bits.map(([bx, by, a], i) => (
          <path key={i} d={`M${f(bx)},${f(by)} q${f(3 * Math.cos(a))},${f(-3)} ${f(6 * Math.cos(a))},${f(2 * Math.sin(a))}`} fill="none" stroke={INK} strokeWidth="1" />
        ))}
      </g>
    );
  }
  const t = (smash - 0.15) / 0.85;
  const rad = lerp(rb * 1.25, r, t);
  const h = lerp(rb * 0.7, 12, t);
  const top = flatRing(x, y - h, rad, radii(rand, 170, 0.05, 0.035 * t, 1));
  const strokes = Math.round(70 + 200 * crust);
  return (
    <g>
      <Shadow x={x + rad * 0.08} y={y + K * rad * 0.2} rx={rad * 1.06} ry={K * rad * 0.9} />
      <Slab top={top} h={h} side={crust > 0.5 ? DEEP : SIDE} />
      {Array.from({ length: Math.round(26 * crust * t) }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const rr = rad * (0.86 + 0.09 * rand());
        return <ellipse key={`h${i}`} cx={x + rr * Math.cos(a)} cy={y - h + K * rr * Math.sin(a)} rx={2.5 + 2.5 * rand()} ry={1.4 + 1.2 * rand()} fill={SIDE} stroke={INK} strokeWidth="0.8" />;
      })}
      {Array.from({ length: strokes }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const rr = rad * (0.97 - 0.75 * rand() ** 1.8);
        const px = x + rr * Math.cos(a);
        const py = y - h + K * rr * Math.sin(a);
        const L = 3 + 4 * rand();
        const b = a + Math.PI / 2 + (rand() - 0.5);
        const edge = rr / rad;
        return (
          <path key={i} d={`M${f(px)},${f(py)} q${f((L * Math.cos(b)) / 2 + 1)},${f((K * L * Math.sin(b)) / 2 - 1)} ${f(L * Math.cos(b))},${f(K * L * Math.sin(b))}`} fill="none" stroke={INK} strokeWidth="0.8" opacity={f(0.25 + (0.35 + 0.4 * crust) * edge)} />
        );
      })}
    </g>
  );
}

/** Height of a patty's top surface above the table, so cheese can sit on it. */
export const pattyTop = (smash: number, r = 150) => (smash < 0.15 ? r * 0.8 : lerp(r * 0.4 * 0.7, 12, (smash - 0.15) / 0.85));

/* ------------------------------------------------------------------ */
/* Half slice of American cheese, melting over the patty edge          */
/* ------------------------------------------------------------------ */

export function Cheese({ x, y, r = 150, melt = 1, lift = 12, seed = 9, whole = false }: { x: number; y: number; r?: number; melt?: number; lift?: number; seed?: number; whole?: boolean }) {
  const rand = rng(seed);
  const s = r * 0.62;
  const rot = 0.95;
  const tri: Pt[] = whole ? [[-s, -s], [s, -s], [s, s], [-s, s]] : [[-s, -s], [s, -s], [-s, s]];
  const pts: Pt[] = [];
  const drips: Pt[] = [];
  for (let i = 0; i < tri.length; i++) {
    const [ax, ay] = tri[i];
    const [bx, by] = tri[(i + 1) % tri.length];
    for (let k = 0; k < 30; k++) {
      const u = ax + ((bx - ax) * k) / 30;
      const v = ay + ((by - ay) * k) / 30;
      let px = u * Math.cos(rot) - v * Math.sin(rot);
      let py = u * Math.sin(rot) + v * Math.cos(rot);
      const rho = Math.hypot(px, py);
      const lim = r * 0.98;
      let droop = 0;
      if (rho > lim) {
        droop = Math.min((rho - lim) * 0.7, 18) * melt;
        const keep = lerp(rho, lim, melt) / rho;
        px *= keep;
        py *= keep;
        if (melt > 0.6 && Math.sin(Math.atan2(py, px)) > 0.2 && rand() < 0.07) drips.push([x + px, y - lift + K * py + droop]);
      }
      pts.push([x + px, y - lift - 3 + K * py + droop + (rand() - 0.5) * 1.2 * melt]);
    }
  }
  const outline = pts.filter((_, i) => i % 2 === 0);
  return (
    <g>
      <path d={smooth(outline)} fill={PAPER} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={smooth(outline)} fill="url(#cheese)" />
      {drips.slice(0, 3).map(([dx, dy], i) => {
        const L = 8 + 10 * melt;
        return <path key={i} d={`M${f(dx - 5)},${f(dy)} C${f(dx - 5)},${f(dy + L)} ${f(dx + 5)},${f(dy + L)} ${f(dx + 5)},${f(dy)}`} fill={PAPER} stroke={INK} strokeWidth="1.3" />;
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Potato: whole (flatten 0), smashed (flatten 1), then crisped        */
/* ------------------------------------------------------------------ */

export function Potato({ x, y, r = 95, flatten = 1, crisp = 1, seed = 5 }: { x: number; y: number; r?: number; flatten?: number; crisp?: number; seed?: number }) {
  const rand = rng(seed);
  const rad = lerp(r * 0.55, r, flatten);
  const h = lerp(r * 0.55, 15, flatten);
  const top = flatRing(x, y - h, rad, radii(rand, 70, lerp(0.05, 0.13, flatten), 0.04 * flatten, 1));
  if (flatten < 0.05) {
    // A whole small potato: a lumpy egg with eyes and specks.
    const body = flatRing(x, y - h * 0.9, rad * 1.3, radii(rand, 40, 0.07, 0, 3)).map(([px, py]) => [px, y - h + (py - (y - h)) * 1.35] as Pt);
    return (
      <g>
        <Shadow x={x + 6} y={y + 4} rx={rad * 1.05} ry={rad * 0.32} />
        <path d={smooth(body)} fill={TOP} stroke={INK} strokeWidth="1.8" />
        <path d={`M${f(x - rad * 0.2)},${f(y - h * 0.05)} Q${f(x + rad * 0.6)},${f(y - h * 0.1)} ${f(x + rad * 0.85)},${f(y - h * 0.8)}`} fill="none" stroke={INK2} strokeWidth="7" opacity="0.3" />
        {[0.3, -0.35, 0.05].map((u, i) => (
          <path key={i} d={`M${f(x + rad * u)},${f(y - h * (1.1 + 0.3 * i))} q4,-3 8,0`} fill="none" stroke={INK} strokeWidth="1.2" />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <circle key={i} cx={x + (rand() - 0.5) * rad * 1.4} cy={y - h + (rand() - 0.5) * h * 1.4} r={0.8} fill={INK} opacity="0.6" />
        ))}
      </g>
    );
  }
  const cracks = Math.round(6 * flatten);
  return (
    <g>
      <Shadow x={x + rad * 0.08} y={y + K * rad * 0.2} rx={rad * 1.06} ry={K * rad * 0.9} />
      <Slab top={top} h={h} side={crisp > 0.5 ? DEEP : SIDE} />
      <path d={smooth(top.map(([px, py]) => [x + (px - x) * 0.8, y - h + (py - (y - h)) * 0.8] as Pt))} fill="none" stroke={INK} strokeWidth={0.8 + crisp} strokeDasharray={crisp > 0.3 ? "3 2" : "2 4"} opacity={0.4 + 0.6 * crisp} />
      {Array.from({ length: cracks }, (_, i) => {
        let a = rand() * Math.PI * 2;
        let rr = 6;
        const p: Pt[] = [[x + rr * Math.cos(a), y - h + K * rr * Math.sin(a)]];
        while (rr < rad * 0.75) {
          rr += 7 + 5 * rand();
          a += (rand() - 0.5) * 0.7;
          p.push([x + rr * Math.cos(a), y - h + K * rr * Math.sin(a)]);
        }
        return <path key={i} d={poly(p, false)} fill="none" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />;
      })}
      {Array.from({ length: 50 + Math.round(40 * crisp) }, (_, i) => {
        const a = rand() * Math.PI * 2;
        const rr = rad * 0.9 * Math.sqrt(rand());
        return <circle key={`s${i}`} cx={x + rr * Math.cos(a)} cy={y - h + K * rr * Math.sin(a)} r={0.6 + 0.7 * rand()} fill={INK} opacity="0.7" />;
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Smaller parts                                                       */
/* ------------------------------------------------------------------ */

/** A cremini mushroom slice standing on edge. brown darkens it as it cooks. */
export function Mushroom({ x, y, s = 60, brown = 0, tilt = 0 }: { x: number; y: number; s?: number; brown?: number; tilt?: number }) {
  const prof: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (Math.PI * i) / 40;
    prof.push([-Math.cos(t), -Math.sin(t) * 0.92]);
  }
  prof.push([0.34, 0], [0.3, 0.85], [-0.3, 0.85], [-0.34, 0]);
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const at = (u: number, v: number): Pt => [x + s * (u * c - v * sn), y - s * 0.85 + s * (u * sn + v * c)];
  const front = prof.map(([u, v]) => at(u, v));
  const back = front.map(([px, py]) => [px + 9, py - 6] as Pt);
  const gill = Array.from({ length: 31 }, (_, i) => at(-Math.cos((Math.PI * i) / 30) * 0.8, -Math.sin((Math.PI * i) / 30) * 0.62));
  return (
    <g>
      <Shadow x={x + 8} y={y + 4} rx={s * 0.85} ry={s * 0.15} />
      <path d={poly(back)} fill={brown > 0.5 ? DEEP : SIDE} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {front.filter((_, i) => i % 5 === 0 && i <= 40).map(([px, py], i) => (
        <path key={i} d={`M${f(px)},${f(py)} l9,-6`} stroke={INK} strokeWidth="1" />
      ))}
      <path d={poly(front)} fill={TOP} stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
      {brown > 0 && <path d={poly(front)} fill="url(#hatch)" opacity={brown * 0.8} />}
      <path d={poly(gill, false)} fill="none" stroke={INK} strokeWidth="1.1" />
      {Array.from({ length: 14 }, (_, k) => {
        const t = (Math.PI * (2 * k + 2)) / 30;
        const a = at(-Math.cos(t) * 0.8, -Math.sin(t) * 0.62);
        const b = at(-Math.cos(t) * 0.36, -Math.sin(t) * 0.08);
        return <path key={k} d={`M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`} stroke={INK2} strokeWidth="0.9" />;
      })}
    </g>
  );
}

/** A sliver of sliced onion lying flat. */
export function OnionSliver({ x, y, s = 34, rot = 0, brown = 0 }: { x: number; y: number; s?: number; rot?: number; brown?: number }) {
  const arc = (k: number) =>
    Array.from({ length: 12 }, (_, i) => {
      const t = Math.PI * (0.15 + (0.7 * i) / 11);
      const u = Math.cos(t + rot) * s * k;
      const v = Math.sin(t + rot) * s * k;
      return [x + u, y + K * v - 4] as Pt;
    });
  const outer = arc(1);
  const inner = arc(0.78).reverse();
  return (
    <g>
      <path d={poly([...outer, ...inner])} fill={brown > 0.5 ? SIDE : PAPER} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={smoothOpen(arc(0.89))} fill="none" stroke={INK2} strokeWidth="0.8" />
    </g>
  );
}

/** A chopped piece of romaine lying flat: ruffled edge, rib, and veins. */
export function Romaine({ x, y, L = 34, W = 15, rot = 0, seed = 1 }: { x: number; y: number; L?: number; W?: number; rot?: number; seed?: number }) {
  const rand = rng(seed);
  const ph = rand() * 6;
  const local: Pt[] = Array.from({ length: 34 }, (_, i) => {
    const t = (2 * Math.PI * i) / 34;
    const k = 1 + 0.06 * Math.sin(7 * t + ph) + 0.03 * (rand() - 0.5);
    return [L * Math.cos(t) * k, W * Math.sin(t) * k * (1 - 0.25 * Math.cos(t))];
  });
  const map = ([u, v]: Pt): Pt => [x + u * Math.cos(rot) - v * Math.sin(rot), y + K * (u * Math.sin(rot) + v * Math.cos(rot))];
  const veins = [-0.45, 0, 0.45].flatMap((k) => [1, -1].map((sg) => [map([L * k, 0]), map([L * k + L * 0.22, sg * W * 0.62])] as const));
  return (
    <g>
      <path d={smooth(local.map(map))} fill={TOP} stroke={INK} strokeWidth="1.3" />
      <path d={smoothOpen([map([-L * 0.85, 0]), map([0, W * 0.08]), map([L * 0.85, 0])])} fill="none" stroke={INK} strokeWidth="1" />
      {veins.map(([a, b], i) => (
        <path key={i} d={`M${f(a[0])},${f(a[1])} L${f(b[0])},${f(b[1])}`} stroke={INK2} strokeWidth="0.7" />
      ))}
    </g>
  );
}

/** A cube in the table view: top face plus the two visible sides. */
function Cube({ x, y, s, face = TOP, children }: { x: number; y: number; s: number; face?: string; children?: ReactNode }) {
  const h = s * 0.9;
  const t: Pt[] = [[x, y - h - s * K], [x + s, y - h], [x, y - h + s * K], [x - s, y - h]];
  return (
    <g>
      <path d={poly([t[3], t[2], [t[2][0], t[2][1] + h], [t[3][0], t[3][1] + h]])} fill={SIDE} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={poly([t[2], t[1], [t[1][0], t[1][1] + h], [t[2][0], t[2][1] + h]])} fill={DEEP} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d={poly(t)} fill={face} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      {children}
    </g>
  );
}

/** A diced tomato cube, with a seed pocket on top. */
export function Tomato({ x, y, s = 13 }: { x: number; y: number; s?: number }) {
  const h = s * 0.9;
  return (
    <Cube x={x} y={y} s={s}>
      <path d={`M${f(x - s * 0.55)},${f(y - h)} Q${f(x)},${f(y - h - s * 0.55)} ${f(x + s * 0.55)},${f(y - h)}`} fill="none" stroke={INK} strokeWidth="0.9" />
      <ellipse cx={x - s * 0.15} cy={y - h - s * 0.12} rx="1.6" ry="1" fill={INK} />
      <ellipse cx={x + s * 0.2} cy={y - h - s * 0.08} rx="1.6" ry="1" fill={INK} />
    </Cube>
  );
}

/** A small cube of raw onion. */
export function OnionDice({ x, y, s = 6 }: { x: number; y: number; s?: number }) {
  return <Cube x={x} y={y} s={s} face={PAPER} />;
}

/** A crinkle-cut dill pickle chip. */
export function Pickle({ x, y, r = 22, seed = 4 }: { x: number; y: number; r?: number; seed?: number }) {
  const rand = rng(seed);
  const rs = Array.from({ length: 64 }, (_, i) => 1 + 0.07 * Math.sin((16 * 2 * Math.PI * i) / 64) + 0.01 * rand());
  const top = flatRing(x, y - 4, r, rs);
  return (
    <g>
      <Slab top={top} h={4} ribs={4} />
      <ellipse cx={x} cy={y - 4} rx={r * 0.7} ry={K * r * 0.7} fill="none" stroke={INK2} strokeWidth="0.8" strokeDasharray="2 2" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3 + 0.3;
        return <ellipse key={i} cx={x + r * 0.38 * Math.cos(a)} cy={y - 4 + K * r * 0.38 * Math.sin(a)} rx="2" ry="1.1" fill={INK} />;
      })}
    </g>
  );
}

/** Pinto beans in a ramekin, with simmer bubbles when cooking. */
export function Beans({ x, y, r = 80, bubbles = 0, phase = 0, seed = 6 }: { x: number; y: number; r?: number; bubbles?: number; phase?: number; seed?: number }) {
  const rand = rng(seed);
  const depth = r * 0.55;
  const beans = Array.from({ length: 13 }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * 0.78;
    return [x + r * d * Math.cos(a), y - depth + K * r * d * Math.sin(a), rand() * 180] as const;
  });
  return (
    <g>
      <Shadow x={x + 8} y={y + 6} rx={r * 1.05} ry={r * 0.35} />
      <path d={`M${f(x - r)},${f(y - depth)} C${f(x - r)},${f(y + 6)} ${f(x + r)},${f(y + 6)} ${f(x + r)},${f(y - depth)}`} fill={SIDE} stroke={INK} strokeWidth="1.8" />
      <ellipse cx={x} cy={y - depth} rx={r} ry={r * K} fill={PAPER} stroke={INK} strokeWidth="1.8" />
      <ellipse cx={x} cy={y - depth + 3} rx={r * 0.9} ry={r * K * 0.9} fill={SIDE} stroke={INK} strokeWidth="1" />
      {beans.map(([bx, by, rot], i) => (
        <g key={i} transform={`rotate(${f(rot)} ${f(bx)} ${f(by)})`}>
          <ellipse cx={bx} cy={by} rx={f(r * 0.13)} ry={f(r * 0.075)} fill={TOP} stroke={INK} strokeWidth="1.2" />
          <path d={`M${f(bx - r * 0.045)},${f(by - r * 0.07)} q${f(r * 0.045)},${f(r * 0.035)} ${f(r * 0.09)},0`} fill="none" stroke={INK} strokeWidth="0.9" />
          <path d={`M${f(bx - r * 0.07)},${f(by + r * 0.02)} q${f(r * 0.06)},${f(r * 0.03)} ${f(r * 0.12)},0`} fill="none" stroke={INK2} strokeWidth="0.8" />
        </g>
      ))}
      {bubbles > 0 &&
        Array.from({ length: 6 }, (_, i) => {
          const life = (phase * 0.8 + i / 6) % 1;
          const bx = x + (rand() - 0.5) * r * 1.2;
          const by = y - depth - life * 30;
          return <circle key={`b${i}`} cx={bx} cy={by} r={3 + 4 * life} fill="none" stroke={INK} strokeWidth="1.1" opacity={bubbles * (1 - life)} />;
        })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Bowl, pan, and tools                                                */
/* ------------------------------------------------------------------ */

/** The back of a wide bowl: body and inside. Draw contents after it, then BowlFront. */
export function BowlBack({ x, y, R = 330, depth = 150 }: { x: number; y: number; R?: number; depth?: number }) {
  // Where the curved body bottoms out, so the foot sits on it.
  const footTop = y + 0.75 * (R * K + depth * 1.2) - 4;
  return (
    <g>
      <Shadow x={x + 20} y={y + R * K + depth * 0.95} rx={R * 0.8} ry={R * 0.2} />
      <path d={`M${f(x - R * 0.3)},${f(footTop)} L${f(x - R * 0.28)},${f(footTop + depth * 0.14)} Q${f(x)},${f(footTop + depth * 0.2)} ${f(x + R * 0.28)},${f(footTop + depth * 0.14)} L${f(x + R * 0.3)},${f(footTop)}`} fill={DEEP} stroke={INK} strokeWidth="1.6" />
      <path d={`M${f(x - R)},${f(y)} C${f(x - R * 0.98)},${f(y + R * K + depth * 1.2)} ${f(x + R * 0.98)},${f(y + R * K + depth * 1.2)} ${f(x + R)},${f(y)}`} fill={SIDE} stroke={INK} strokeWidth="2" />
      <ellipse cx={x} cy={y} rx={R} ry={R * K} fill={PAPER} stroke={INK} strokeWidth="2" />
      <ellipse cx={x} cy={y + 6} rx={R - 16} ry={(R - 16) * K} fill={TOP} stroke={INK} strokeWidth="1.2" />
      <path d={`M${f(x - (R - 16))},${f(y + 6)} A${f(R - 16)},${f((R - 16) * K)} 0 0 1 ${f(x + R - 16)},${f(y + 6)}`} fill="none" stroke={INK2} strokeWidth="10" opacity="0.25" />
    </g>
  );
}

/** The front lip of the bowl, drawn over its contents. */
export function BowlFront({ x, y, R = 330 }: { x: number; y: number; R?: number }) {
  const outer = `M${f(x - R)},${f(y)} A${f(R)},${f(R * K)} 0 0 0 ${f(x + R)},${f(y)}`;
  const inner = `L${f(x + R - 16)},${f(y + 6)} A${f(R - 16)},${f((R - 16) * K)} 0 0 1 ${f(x - R + 16)},${f(y + 6)} Z`;
  return <path d={`${outer} ${inner}`} fill={PAPER} stroke={INK} strokeWidth="2" strokeLinejoin="round" />;
}

/** A cast iron skillet. heat adds shimmer lines above the surface. */
export function Skillet({ x, y, R = 280, heat = 0, phase = 0 }: { x: number; y: number; R?: number; heat?: number; phase?: number }) {
  const hx = x + R * 0.95;
  return (
    <g>
      <Shadow x={x + 14} y={y + 22} rx={R * 1.05} ry={R * K * 0.95} />
      <path d={`M${f(hx - 6)},${f(y - 22)} L${f(hx + R * 0.7)},${f(y - 70)} L${f(hx + R * 0.73)},${f(y - 50)} L${f(hx + 8)},${f(y - 2)} Z`} fill={DEEP} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      <path d={`M${f(x - R)},${f(y - 20)} L${f(x - R)},${f(y)} A${f(R)},${f(R * K)} 0 0 0 ${f(x + R)},${f(y)} L${f(x + R)},${f(y - 20)}`} fill={DEEP} stroke={INK} strokeWidth="2" />
      <ellipse cx={x} cy={y - 20} rx={R} ry={R * K} fill={SIDE} stroke={INK} strokeWidth="2" />
      <ellipse cx={x} cy={y - 14} rx={R - 18} ry={(R - 18) * K} fill={SIDE} stroke={INK} strokeWidth="1.2" />
      <ellipse cx={x} cy={y - 14} rx={R - 18} ry={(R - 18) * K} fill="url(#iron)" opacity="0.6" />
      {heat > 0 &&
        [-0.45, -0.15, 0.15, 0.45].map((u, i) => {
          const sx = x + u * R;
          const pts: Pt[] = Array.from({ length: 8 }, (_, k) => [sx + Math.sin(phase * 6 + k * 1.3 + i) * 6 * heat, y - 40 - k * 14]);
          return <path key={i} d={smoothOpen(pts)} fill="none" stroke={ACCENT} strokeWidth="1.6" opacity={0.7 * heat} />;
        })}
    </g>
  );
}

/** A wide metal spatula, blade flat at (x, y). lift raises it above the pan. */
export function Spatula({ x, y, lift = 0 }: { x: number; y: number; lift?: number }) {
  const yy = y - lift;
  return (
    <g>
      <path d={`M${f(x - 70)},${f(yy - 10)} L${f(x + 40)},${f(yy - 34)} L${f(x + 80)},${f(yy - 6)} L${f(x - 30)},${f(yy + 18)} Z`} fill={TOP} stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
      {[-0.3, 0, 0.3].map((u, i) => (
        <path key={i} d={`M${f(x - 20 + u * 60)},${f(yy - 2 - u * 14)} l40,-9`} stroke={INK2} strokeWidth="0.9" />
      ))}
      <path d={`M${f(x + 60)},${f(yy - 20)} L${f(x + 230)},${f(yy - 150)}`} stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d={`M${f(x + 60)},${f(yy - 20)} L${f(x + 230)},${f(yy - 150)}`} stroke={DEEP} strokeWidth="8" strokeLinecap="round" />
    </g>
  );
}

/** A square of parchment lying on the food. */
export function Parchment({ x, y, s = 110, opacity = 1 }: { x: number; y: number; s?: number; opacity?: number }) {
  const t: Pt[] = [[x, y - s * K], [x + s, y], [x, y + s * K], [x - s, y]];
  return <path d={poly(t)} fill={PAPER} stroke={INK} strokeWidth="1.4" strokeDasharray="6 3" opacity={opacity} />;
}

/** A drinking glass, used to press the potatoes flat. */
export function Cup({ x, y, r = 46, lift = 0 }: { x: number; y: number; r?: number; lift?: number }) {
  const b = y - lift;
  const t = b - r * 2.2;
  return (
    <g>
      <path d={`M${f(x - r)},${f(t)} L${f(x - r * 0.9)},${f(b)} A${f(r * 0.9)},${f(r * 0.9 * K)} 0 0 0 ${f(x + r * 0.9)},${f(b)} L${f(x + r)},${f(t)}`} fill={TOP} stroke={INK} strokeWidth="1.8" opacity="0.92" />
      <ellipse cx={x} cy={t} rx={r} ry={r * K} fill={PAPER} stroke={INK} strokeWidth="1.8" />
      <path d={`M${f(x - r * 0.6)},${f(t + 14)} L${f(x - r * 0.55)},${f(b - 14)}`} stroke={PAPER} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

/** A pot lid with rising steam. */
export function Lid({ x, y, R = 190, steam = 0, phase = 0 }: { x: number; y: number; R?: number; steam?: number; phase?: number }) {
  return (
    <g>
      <path d={`M${f(x - R)},${f(y)} C${f(x - R)},${f(y - R * 0.55)} ${f(x + R)},${f(y - R * 0.55)} ${f(x + R)},${f(y)}`} fill={TOP} stroke={INK} strokeWidth="1.8" opacity="0.92" />
      <ellipse cx={x} cy={y} rx={R} ry={R * K * 0.35} fill="none" stroke={INK} strokeWidth="1.8" />
      <ellipse cx={x} cy={y - R * 0.42} rx="18" ry="8" fill={DEEP} stroke={INK} strokeWidth="1.5" />
      {steam > 0 &&
        [-0.4, 0, 0.4].map((u, i) => {
          const pts: Pt[] = Array.from({ length: 7 }, (_, k) => [x + u * R + Math.sin(phase * 5 + k + i) * 10, y - R * 0.5 - 20 - k * 16]);
          return <path key={i} d={smoothOpen(pts)} fill="none" stroke={INK2} strokeWidth="2" opacity={steam * 0.8} strokeLinecap="round" />;
        })}
    </g>
  );
}

/** Rising heat waves, for the air fryer or oven. */
export function HeatWaves({ x, y, w = 300, amount = 1, phase = 0 }: { x: number; y: number; w?: number; amount?: number; phase?: number }) {
  return (
    <g opacity={amount}>
      {Array.from({ length: 6 }, (_, i) => {
        const sx = x - w / 2 + (i + 0.5) * (w / 6);
        const pts: Pt[] = Array.from({ length: 7 }, (_, k) => [sx + Math.sin(phase * 7 + k * 1.2 + i) * 7, y - k * 16]);
        return <path key={i} d={smoothOpen(pts)} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />;
      })}
    </g>
  );
}

/** A drizzle of sauce drawn on as progress goes from 0 to 1. */
export function Drizzle({ points, progress = 1, width = 5 }: { points: Pt[]; progress?: number; width?: number }) {
  const d = smoothOpen(points);
  return (
    <g>
      <path d={d} fill="none" stroke={PAPER} strokeWidth={width + 4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(progress)} />
      <path d={d} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(progress)} />
      <path d={d} fill="none" stroke={PAPER} strokeWidth={width * 0.35} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - clamp01(progress)} opacity="0.8" />
    </g>
  );
}

/** A small cup of special sauce with a stirred swirl. */
export function SauceCup({ x, y, r = 70, swirl = 1, spin = 0 }: { x: number; y: number; r?: number; swirl?: number; spin?: number }) {
  const depth = r * 0.6;
  const sp: Pt[] = Array.from({ length: 40 }, (_, i) => {
    const t = (i / 39) * Math.PI * 4 + spin;
    const rr = (r * 0.75 * i) / 39;
    return [x + rr * Math.cos(t), y - depth + K * rr * Math.sin(t)];
  });
  return (
    <g>
      <Shadow x={x + 6} y={y + 6} rx={r} ry={r * 0.3} />
      <path d={`M${f(x - r)},${f(y - depth)} L${f(x - r * 0.8)},${f(y)} A${f(r * 0.8)},${f(r * 0.8 * K)} 0 0 0 ${f(x + r * 0.8)},${f(y)} L${f(x + r)},${f(y - depth)}`} fill={SIDE} stroke={INK} strokeWidth="1.8" />
      <ellipse cx={x} cy={y - depth} rx={r} ry={r * K} fill={PAPER} stroke={INK} strokeWidth="1.8" />
      <ellipse cx={x} cy={y - depth + 2} rx={r * 0.88} ry={r * K * 0.88} fill={TOP} />
      <path d={smoothOpen(sp)} fill="none" stroke={INK} strokeWidth="1.6" opacity={swirl} />
    </g>
  );
}

/** A numbered callout with a leader line, in the drawing's label style. */
export function Callout({ x, y, tx, ty, n, text, anchor = "start", size = 20 }: { x: number; y: number; tx: number; ty: number; n?: number | string; text: string; anchor?: "start" | "end"; size?: number }) {
  const dx = anchor === "start" ? 30 : -30;
  return (
    <g>
      <path d={`M${f(tx)},${f(ty)} L${f(x)},${f(y)}`} stroke={INK2} strokeWidth="1.2" />
      <circle cx={tx} cy={ty} r="3.5" fill={INK} />
      {n !== undefined && (
        <>
          <circle cx={x} cy={y} r="19" fill={PAPER} stroke={INK} strokeWidth="1.6" />
          <text x={x} y={y + 6} textAnchor="middle" fontFamily={MONO} fontSize="17" fill={INK}>
            {n}
          </text>
        </>
      )}
      <text x={x + (n !== undefined ? dx : 0)} y={y + 7} textAnchor={anchor} fontFamily={MONO} fontSize={size} fill={INK}>
        {text}
      </text>
    </g>
  );
}
