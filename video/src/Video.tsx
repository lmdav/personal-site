// The narrated how-to video. Every scene animates the action its narration
// describes, using the shared parts in parts.tsx.
import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { K, clamp01, lerp, rng, type Pt } from "./geo";
import {
  Beans,
  BowlBack,
  BowlFront,
  Callout,
  Cheese,
  Cup,
  Defs,
  Drizzle,
  HeatWaves,
  Lid,
  Mushroom,
  OnionDice,
  OnionSliver,
  Parchment,
  Patty,
  Pickle,
  Potato,
  Romaine,
  SauceCup,
  Skillet,
  Spatula,
  Tomato,
} from "./parts";
import { ACCENT, GRID, HAND, INK, INK2, MONO, PAPER, SERIF, TOP } from "./theme";

export const SCENES = ["title", "kit", "potatoes", "sauceBeans", "mushrooms", "smash", "build", "finish"] as const;
export type Scene = (typeof SCENES)[number];

export type VideoProps = {
  slug: string;
  title: string;
  facts: string[];
  captions: Record<Scene, string>;
  /** Narration length in seconds per scene (from narrate.py). */
  durations: Record<Scene, number>;
};

const FPS = 30;
const LEAD = 12; // frames of quiet before each narration line
const TAIL = 18; // frames after it

export const sceneFrames = (seconds: number) => Math.round(seconds * FPS) + LEAD + TAIL;

const ease = Easing.inOut(Easing.cubic);
/** Progress from 0 to 1 between two points of the scene, given as fractions. */
function useSpan(a: number, b: number) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return interpolate(frame / durationInFrames, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/* ------------------------------------------------------------------ */
/* Frame: paper, grid, border, header, caption                         */
/* ------------------------------------------------------------------ */

function Paper({ label, caption, children }: { label: string; caption: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const show = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <Defs />
        <rect width="1920" height="1080" fill="url(#paper-grid)" />
        <rect x="28" y="28" width="1864" height="1024" fill="none" stroke={INK} strokeWidth="2" />
        <text x="64" y="84" fontFamily={MONO} fontSize="22" fill={INK2} letterSpacing="3">
          SMASH BURGER BOWL
        </text>
        <text x="1856" y="84" textAnchor="end" fontFamily={MONO} fontSize="22" fill={INK} letterSpacing="3">
          {label}
        </text>
        {children}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          bottom: 56,
          padding: "18px 28px",
          backgroundColor: PAPER,
          border: `2px solid ${INK}`,
          fontFamily: MONO,
          fontSize: 30,
          lineHeight: 1.35,
          color: INK,
          textAlign: "center",
          opacity: show,
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
}

function Timer({ x, y, minutes, progress, label, size = 150 }: { x: number; y: number; minutes: number; progress: number; label: string; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const left = Math.round(minutes * 60 * (1 - progress));
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={PAPER} stroke={GRID} strokeWidth="10" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * progress} transform={`rotate(-90 ${x} ${y})`} />
      <text x={x} y={y + 12} textAnchor="middle" fontFamily={MONO} fontSize={size * 0.24} fill={INK}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </text>
      <text x={x} y={y + r + 44} textAnchor="middle" fontFamily={MONO} fontSize="22" fill={INK2}>
        {label}
      </text>
    </g>
  );
}

function Note({ x, y, text, show, rot = -4 }: { x: number; y: number; text: string; show: number; rot?: number }) {
  return (
    <text x={x} y={y} fontFamily={HAND} fontSize="44" fill={ACCENT} opacity={show} transform={`rotate(${rot} ${x} ${y})`}>
      {text}
    </text>
  );
}

/* ------------------------------------------------------------------ */
/* The finished bowl, with parts that fly in for the build scene       */
/* ------------------------------------------------------------------ */

type Item = { u: number; v: number; draw: (x: number, y: number) => ReactNode };

function bowlItems(R: number): { cold: Item[]; hot: Item[] } {
  const rand = rng(21);
  const s = R / 420;
  const cold: Item[] = [];
  for (let i = 0; i < 16; i++) {
    const u = -0.12 - 0.72 * rand();
    const v = (rand() * 2 - 1) * Math.sqrt(Math.max(0, 1 - u * u)) * 0.8;
    const rot = rand() * Math.PI;
    cold.push({ u, v, draw: (x, y) => <Romaine x={x} y={y} L={34 * s} W={15 * s} rot={rot} seed={i + 1} /> });
  }
  const extra: [number, number, "t" | "o" | "p"][] = [
    [-0.55, -0.35, "t"], [-0.3, 0.1, "t"], [-0.7, 0.25, "t"], [-0.42, 0.5, "t"], [-0.2, -0.5, "t"],
    [-0.62, -0.05, "o"], [-0.36, -0.2, "o"], [-0.5, 0.3, "o"], [-0.25, 0.4, "o"], [-0.75, -0.25, "o"],
    [-0.45, -0.55, "p"], [-0.18, 0.15, "p"], [-0.62, 0.55, "p"],
  ];
  for (const [u, v, kind] of extra) {
    cold.push({
      u,
      v,
      draw: (x, y) => (kind === "t" ? <Tomato x={x} y={y} s={13 * s} /> : kind === "o" ? <OnionDice x={x} y={y} s={7 * s} /> : <Pickle x={x} y={y} r={22 * s} />),
    });
  }
  const hot: Item[] = [
    { u: 0.62, v: -0.1, draw: (x, y) => <Potato x={x} y={y} r={62 * s} seed={31} /> },
    { u: 0.3, v: 0.45, draw: (x, y) => <Potato x={x} y={y} r={60 * s} seed={32} /> },
    { u: 0.66, v: 0.5, draw: (x, y) => <Potato x={x} y={y} r={58 * s} seed={33} /> },
    { u: 0.33, v: -0.45, draw: (x, y) => <><Patty x={x} y={y} r={92 * s} seed={41} /><Cheese x={x} y={y} r={92 * s} lift={12} seed={42} /></> },
    { u: 0.32, v: 0.05, draw: (x, y) => <><Patty x={x} y={y} r={88 * s} seed={43} /><Cheese x={x} y={y} r={88 * s} lift={12} seed={44} /></> },
    { u: 0.72, v: -0.5, draw: (x, y) => <Mushroom x={x} y={y} s={34 * s} brown={1} tilt={0.3} /> },
    { u: 0.82, v: 0.15, draw: (x, y) => <Mushroom x={x} y={y} s={32 * s} brown={1} tilt={-0.2} /> },
    { u: 0.12, v: 0.25, draw: (x, y) => <OnionSliver x={x} y={y} s={30 * s} rot={0.6} brown={1} /> },
    { u: 0.52, v: 0.25, draw: (x, y) => <OnionSliver x={x} y={y} s={30 * s} rot={2.2} brown={1} /> },
  ];
  return { cold, hot };
}

export function BuiltBowl({ x, y, R = 420, coldIn = 1, hotIn = 1, sauce = 1 }: { x: number; y: number; R?: number; coldIn?: number; hotIn?: number; sauce?: number }) {
  const { cold, hot } = bowlItems(R);
  const place = (items: Item[], amount: number) =>
    items.map((it, i) => {
      const lp = clamp01((amount - (i / items.length) * 0.6) / 0.4);
      const px = x + it.u * (R - 50);
      const py = y + 6 + it.v * (R - 50) * K;
      return { v: it.v, lp, node: it.draw(px, py - (1 - Easing.out(Easing.cubic)(lp)) * 520), key: `${it.u}-${it.v}` };
    });
  const all = [...place(cold, coldIn), ...place(hot, hotIn)].filter((p) => p.lp > 0).sort((a, b) => a.v - b.v);
  const drizzle: Pt[] = Array.from({ length: 9 }, (_, i) => {
    const u = -0.72 + (1.44 * i) / 8;
    return [x + u * (R - 60), y + 6 + Math.sin(i * 1.7) * 0.16 * (R - 60) * K - 12];
  });
  return (
    <g>
      <BowlBack x={x} y={y} R={R} depth={R * 0.4} />
      {all.map((p) => (
        <g key={p.key} opacity={Math.min(1, p.lp * 3)}>
          {p.node}
        </g>
      ))}
      <BowlFront x={x} y={y} R={R} />
      {sauce > 0 && <Drizzle points={drizzle} progress={sauce} width={6 * (R / 420)} />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

function TitleScene({ p }: { p: VideoProps }) {
  const draw = useSpan(0, 0.25);
  const text = useSpan(0.15, 0.35);
  const bowl = useSpan(0.1, 0.5);
  return (
    <Paper label="RECIPE DRAWING" caption={p.captions.title}>
      <rect x="120" y="300" width="900" height="380" fill={PAPER} stroke={INK} strokeWidth="3" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      <path d="M120 560H1020" stroke={INK} strokeWidth="2" opacity={draw} />
      <g opacity={text}>
        <text x="160" y="370" fontFamily={MONO} fontSize="24" fill={INK2} letterSpacing="3">
          LIAM&apos;S KITCHEN
        </text>
        <text x="156" y="500" fontFamily={SERIF} fontSize="128" fill={INK}>
          {p.title}
        </text>
        {p.facts.map((fact, i) => (
          <text key={fact} x={160 + i * 225} y="630" fontFamily={MONO} fontSize="28" fill={INK}>
            {fact}
          </text>
        ))}
      </g>
      <g opacity={bowl} transform={`translate(0 ${(1 - bowl) * 40})`}>
        <BuiltBowl x={1450} y={420} R={310} />
      </g>
    </Paper>
  );
}

function KitScene({ p }: { p: VideoProps }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const items: { at: number; x: number; y: number; label: string; node: ReactNode }[] = [
    { at: 0.14, x: 260, y: 340, label: "6 oz lean beef", node: <Patty x={260} y={340} r={120} smash={0} crust={0} /> },
    { at: 0.2, x: 620, y: 340, label: "1 slice cheese", node: <Cheese x={620} y={360} r={95} melt={0} lift={0} whole /> },
    { at: 0.3, x: 960, y: 340, label: "8 oz small potatoes", node: <><Potato x={900} y={340} r={80} flatten={0} crisp={0} seed={2} /><Potato x={1010} y={350} r={70} flatten={0} crisp={0} seed={3} /></> },
    { at: 0.38, x: 1310, y: 340, label: "Mushrooms", node: <><Mushroom x={1270} y={350} s={60} /><Mushroom x={1370} y={350} s={55} tilt={0.3} /></> },
    { at: 0.44, x: 1660, y: 340, label: "1/2 onion", node: <><OnionSliver x={1630} y={330} s={60} rot={0.3} /><OnionDice x={1700} y={340} s={14} /><OnionDice x={1730} y={360} s={14} /></> },
    { at: 0.52, x: 260, y: 660, label: "2 cups romaine", node: <><Romaine x={220} y={640} L={60} W={26} rot={0.3} seed={3} /><Romaine x={300} y={670} L={60} W={26} rot={2.2} seed={4} /></> },
    { at: 0.58, x: 620, y: 660, label: "1 small tomato", node: <><Tomato x={590} y={660} s={26} /><Tomato x={660} y={670} s={26} /></> },
    { at: 0.63, x: 960, y: 660, label: "Pickle chips", node: <><Pickle x={920} y={660} r={40} seed={2} /><Pickle x={1010} y={670} r={40} seed={3} /></> },
    { at: 0.72, x: 1310, y: 660, label: "Yogurt sauce", node: <SauceCup x={1310} y={680} r={95} /> },
    { at: 0.84, x: 1660, y: 660, label: "1/2 cup pinto beans", node: <Beans x={1660} y={690} r={100} /> },
  ];
  return (
    <Paper label="WHAT YOU NEED" caption={p.captions.kit}>
      {items.map((it) => {
        const lp = clamp01((t - it.at) / 0.06);
        const sc = lerp(1.0, 1.35, Easing.out(Easing.back(1.6))(lp));
        return (
          <g key={it.label} opacity={lp} transform={`translate(${it.x} ${it.y}) scale(${sc}) translate(${-it.x} ${-it.y})`}>
            {it.node}
            <text x={it.x} y={it.y + 105} textAnchor="middle" fontFamily={MONO} fontSize="19" fill={INK}>
              {it.label}
            </text>
          </g>
        );
      })}
    </Paper>
  );
}

function PotatoScene({ p }: { p: VideoProps }) {
  const frame = useCurrentFrame();
  const micro = useSpan(0.04, 0.3);
  const cupDown = useSpan(0.32, 0.42);
  const cupUp = useSpan(0.5, 0.58);
  const flatten = useSpan(0.4, 0.48);
  const oil = useSpan(0.58, 0.7);
  const fry = useSpan(0.7, 0.98);
  const pokes = Math.min(4, Math.floor(micro * 16));
  return (
    <Paper label="STEP 1 · POTATOES" caption={p.captions.potatoes}>
      <Potato x={900} y={700} r={200} flatten={flatten} crisp={fry} seed={7} />
      {flatten < 0.05 &&
        Array.from({ length: pokes }, (_, i) => <circle key={i} cx={830 + i * 45} cy={600 + (i % 2) * 18} r="4" fill={INK} />)}
      {micro > 0 && micro < 1 && <Timer x={1550} y={360} minutes={6} progress={micro} label="Microwave, high" />}
      {cupDown > 0 && cupUp < 1 && (
        <g opacity={1 - cupUp}>
          <Cup x={900} y={700 - lerp(110, 30, flatten)} r={90} lift={lerp(320, 0, cupDown) + cupUp * 260} />
        </g>
      )}
      {oil > 0 &&
        oil < 1 &&
        Array.from({ length: 7 }, (_, i) => {
          const fall = (oil * 3 + i / 7) % 1;
          return <ellipse key={i} cx={760 + i * 45} cy={300 + fall * 340} rx="5" ry="8" fill={TOP} stroke={INK} strokeWidth="1.3" opacity={1 - fall * 0.6} />;
        })}
      {fry > 0 && (
        <>
          <HeatWaves x={900} y={560} w={420} amount={Math.min(1, fry * 3)} phase={frame / 30} />
          <Timer x={1550} y={360} minutes={15} progress={fry} label="Air fryer, 400°F" />
        </>
      )}
      <Note x={1240} y={760} text="dry = crisp" show={useSpan(0.75, 0.85)} />
    </Paper>
  );
}

function SauceBeansScene({ p }: { p: VideoProps }) {
  const frame = useCurrentFrame();
  const drops = useSpan(0.02, 0.3);
  const stir = useSpan(0.28, 0.5);
  const beans = useSpan(0.45, 0.6);
  return (
    <Paper label="WHILE THEY COOK" caption={p.captions.sauceBeans}>
      <SauceCup x={560} y={720} r={170} swirl={stir} spin={stir * 10} />
      {drops > 0 &&
        drops < 1 &&
        Array.from({ length: 5 }, (_, i) => {
          const fall = clamp01(drops * 2.2 - i * 0.25);
          return <ellipse key={i} cx={500 + i * 30} cy={lerp(240, 560, fall)} rx="18" ry="12" fill={i % 2 ? TOP : PAPER} stroke={INK} strokeWidth="1.5" opacity={fall < 1 ? 1 : 0} />;
        })}
      <text x="560" y="860" textAnchor="middle" fontFamily={MONO} fontSize="26" fill={INK}>
        Special sauce, chill 10 min
      </text>
      <g opacity={beans} transform={`translate(0 ${(1 - beans) * 30})`}>
        <Beans x={1360} y={740} r={210} bubbles={beans} phase={frame / 40} />
        <text x="1360" y="860" textAnchor="middle" fontFamily={MONO} fontSize="26" fill={INK}>
          Beans, medium-low, until glossy
        </text>
      </g>
    </Paper>
  );
}

function MushroomScene({ p }: { p: VideoProps }) {
  const frame = useCurrentFrame();
  const brown = useSpan(0.1, 0.65);
  const splash = useSpan(0.68, 0.85);
  const rand = rng(3);
  const pieces = Array.from({ length: 11 }, (_, i) => ({ x: 900 + (rand() - 0.5) * 470, y: 590 + (rand() - 0.5) * 150, kind: i % 3, rot: rand() * 3 }));
  return (
    <Paper label="STEP 5 · MUSHROOMS" caption={p.captions.mushrooms}>
      <Skillet x={900} y={600} R={360} heat={0.6} phase={frame / 30} />
      {pieces
        .sort((a, b) => a.y - b.y)
        .map((pc, i) =>
          pc.kind === 2 ? <OnionSliver key={i} x={pc.x} y={pc.y} s={46} rot={pc.rot} brown={brown} /> : <Mushroom key={i} x={pc.x} y={pc.y} s={48} brown={brown} tilt={pc.rot - 1.5} />,
        )}
      {splash > 0 &&
        splash < 1 &&
        Array.from({ length: 6 }, (_, i) => {
          const fall = clamp01(splash * 1.6 - i * 0.1);
          return <ellipse key={i} cx={820 + i * 30} cy={lerp(240, 540, fall)} rx="5" ry="9" fill={INK} opacity={1 - fall * 0.5} />;
        })}
      <Note x={1320} y={380} text="dry pan first" show={useSpan(0.15, 0.25)} />
      <Note x={1320} y={440} text="Worcestershire last" show={useSpan(0.7, 0.8)} rot={-2} />
    </Paper>
  );
}

function SmashScene({ p }: { p: VideoProps }) {
  const frame = useCurrentFrame();
  const drop = useSpan(0.04, 0.14);
  const parchIn = useSpan(0.18, 0.26);
  const press = useSpan(0.27, 0.38);
  const spatUp = useSpan(0.4, 0.46);
  const wait = useSpan(0.46, 0.7);
  const flip = useSpan(0.7, 0.77);
  const melt = useSpan(0.78, 0.9);
  const lid = useSpan(0.88, 0.97);
  const flipScale = flip > 0 && flip < 1 ? Math.abs(Math.cos(flip * Math.PI)) : 1;
  const px = 880;
  const py = 620;
  const smash = press;
  const crust = Math.max(wait, flip > 0.5 ? 1 : 0);
  return (
    <Paper label="STEP 7 · SMASH" caption={p.captions.smash}>
      <Skillet x={880} y={640} R={380} heat={1} phase={frame / 30} />
      <g transform={`translate(${px} ${py}) scale(1 ${flipScale}) translate(${-px} ${-py})`}>
        <g transform={`translate(0 ${-(1 - Easing.bounce(drop)) * 500})`}>
          <Patty x={px} y={py} r={185} smash={smash} crust={crust} seed={17} />
        </g>
      </g>
      {melt > 0 && <Cheese x={px} y={py} r={185} melt={melt} lift={12} seed={18} />}
      {parchIn > 0 && spatUp < 1 && <Parchment x={px + (1 - parchIn) * 700} y={py - lerp(70, 14, smash)} s={140} opacity={1 - spatUp} />}
      {press > 0 && spatUp < 1 && <Spatula x={px} y={py - lerp(80, 16, smash)} lift={lerp(260, 0, press) + spatUp * 400} />}
      {wait > 0 && wait < 1 && (
        <>
          <Timer x={1580} y={330} minutes={2} progress={wait} label="Hands off" />
          <Note x={1300} y={560} text="crust forming" show={Math.min(1, wait * 4)} />
        </>
      )}
      {lid > 0 && (
        <g transform={`translate(0 ${(1 - lid) * -300})`} opacity={lid}>
          <Lid x={px} y={py - 10} R={240} steam={lid} phase={frame / 30} />
        </g>
      )}
      <Callout x={1420} y={800} tx={px + 150} ty={py - 20} text="Lacy edges = crunch" size={24} />
    </Paper>
  );
}

function BuildScene({ p }: { p: VideoProps }) {
  const cold = useSpan(0.08, 0.42);
  const hot = useSpan(0.42, 0.74);
  const sauce = useSpan(0.76, 0.9);
  const beans = useSpan(0.88, 0.98);
  return (
    <Paper label="STEP 8 · BUILD" caption={p.captions.build}>
      <BuiltBowl x={880} y={440} R={390} coldIn={cold} hotIn={hot} sauce={sauce} />
      <text x="600" y="180" textAnchor="middle" fontFamily={MONO} fontSize="28" fill={INK} opacity={cold}>
        COLD SIDE
      </text>
      <text x="1160" y="180" textAnchor="middle" fontFamily={MONO} fontSize="28" fill={INK} opacity={hot}>
        HOT SIDE
      </text>
      <g opacity={beans} transform={`translate(${(1 - beans) * 300} 0)`}>
        <Beans x={1600} y={700} r={120} />
      </g>
    </Paper>
  );
}

function FinishScene({ p }: { p: VideoProps }) {
  const show = useSpan(0, 0.2);
  const facts = useSpan(0.15, 0.4);
  return (
    <Paper label="READY" caption={p.captions.finish}>
      <g opacity={show}>
        <BuiltBowl x={660} y={430} R={370} />
        <Beans x={1130} y={700} r={100} />
      </g>
      <g opacity={facts}>
        <text x="1300" y="420" fontFamily={SERIF} fontSize="150" fill={INK}>
          Ready.
        </text>
        {["~900 kcal", "57 g protein", "15 g fiber"].map((fact, i) => (
          <text key={fact} x="1310" y={500 + i * 50} fontFamily={MONO} fontSize="34" fill={INK}>
            {fact}
          </text>
        ))}
        <text x="1310" y="700" fontFamily={MONO} fontSize="30" fill={INK2} letterSpacing="2">
          lmdav.com/recipes
        </text>
      </g>
    </Paper>
  );
}

const SCENE_VIEWS: Record<Scene, (props: { p: VideoProps }) => ReactNode> = {
  title: TitleScene,
  kit: KitScene,
  potatoes: PotatoScene,
  sauceBeans: SauceBeansScene,
  mushrooms: MushroomScene,
  smash: SmashScene,
  build: BuildScene,
  finish: FinishScene,
};

export function HowToVideo(p: VideoProps) {
  let at = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {SCENES.map((scene) => {
        const len = sceneFrames(p.durations[scene]);
        const from = at;
        at += len;
        const View = SCENE_VIEWS[scene];
        return (
          <Sequence key={scene} from={from} durationInFrames={len} name={scene}>
            <View p={p} />
            <Sequence from={LEAD}>
              <Audio src={staticFile(`${p.slug}/narration/${scene}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

export const totalFrames = (durations: Record<Scene, number>) => SCENES.reduce((sum, s) => sum + sceneFrames(durations[s]), 0);
