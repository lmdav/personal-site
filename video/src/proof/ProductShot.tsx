// Proof of concept for v4 (docs/recipes-media-v4.md): the bowl pulls apart into
// labeled layers and reassembles, built from photo cutouts of real food.
import { CameraMotionBlur } from "@remotion/motion-blur";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SERIF } from "../theme";

export const PROOF_FRAMES = 390;

const BOWL = { w: 860, h: (860 * 955) / 1400 };
const BOWL_X = 960 - BOWL.w / 2;
const BOWL_TOP = 430;

type Layer = {
  id: string;
  src: string;
  w: number;
  ratio: number; // height / width of the image
  squash: number; // vertical squash, so overhead photos sit at the bowl's angle
  rest: { x: number; y: number; rot: number }; // center inside the bowl
  slot: { x: number; y: number; rot: number }; // center when pulled apart
  label: string;
  amount: string;
  /** Extra copies of the image in the same layer, to fill the bowl. */
  copies?: { dx: number; dy: number; flip?: boolean; scale?: number }[];
};

// Bottom to top, in build order.
const LAYERS: Layer[] = [
  { id: "romaine", src: "proof/romaine.png", w: 500, ratio: 1033 / 1400, squash: 0.6, rest: { x: 790, y: 650, rot: -6 }, slot: { x: 860, y: 560, rot: -3 }, label: "Romaine", amount: "2 cups, chopped", copies: [{ dx: 300, dy: 40, flip: true, scale: 0.95 }] },
  { id: "potatoes", src: "proof/potatoes.png", w: 400, ratio: 1000 / 1400, squash: 0.7, rest: { x: 1120, y: 650, rot: 4 }, slot: { x: 860, y: 375, rot: 2 }, label: "Crispy potatoes", amount: "8 oz, smashed" },
  { id: "patties", src: "proof/patties.png", w: 360, ratio: 495 / 638, squash: 0.95, rest: { x: 985, y: 600, rot: -3 }, slot: { x: 860, y: 190, rot: 0 }, label: "Smash patties", amount: "6 oz, 90% lean" },
];

// Two loose strands of sauce zigzagging across the bowl, like a real drizzle.
// Two loose strands of sauce looping across the bowl, like a real drizzle.
const STRANDS: [number, number][][] = [
  [[700, 600], [780, 575], [850, 618], [930, 570], [1000, 612], [1090, 566], [1160, 606], [1240, 584]],
  [[730, 648], [820, 610], [900, 652], [985, 606], [1070, 648], [1150, 612], [1225, 640]],
];

/** A smooth curve through the points (Catmull-Rom as cubic Beziers). */
function strandD(p: [number, number][]) {
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const p3 = p[Math.min(i + 2, p.length - 1)];
    d += ` C${x1 + (x2 - p0[0]) / 6},${y1 + (y2 - p0[1]) / 6} ${x2 - (p3[0] - x1) / 6},${y2 - (p3[1] - y1) / 6} ${x2},${y2}`;
  }
  return d;
}

function Scene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // How far each layer is pulled apart (0 in the bowl, 1 at its slot).
  const n = LAYERS.length;
  const apart = LAYERS.map((_, i) => {
    const up = interpolate(frame, [45 + (n - 1 - i) * 5, 95 + (n - 1 - i) * 5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.back(1.3)),
    });
    const down = spring({ frame: frame - (212 + i * 7), fps, config: { damping: 13, stiffness: 110, mass: 0.9 } });
    return Math.max(0, up * (1 - down));
  });
  const bowlDrop = interpolate(frame, [40, 90, 205, 245], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const sauce = interpolate(frame, [292, 330], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const title = interpolate(frame, [335, 360], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const push = interpolate(frame, [0, PROOF_FRAMES], [1, 1.06]);

  const bowlY = BOWL_TOP + bowlDrop * 190;
  const bowlScale = 1 - bowlDrop * 0.12;
  const rimCx = BOWL.w / 2;
  const rimCy = BOWL.h * 0.31;
  const rimRx = BOWL.w * 0.485;
  const rimRy = BOWL.h * 0.31;

  const bowl = (clip?: string) => (
    <g transform={`translate(${960} ${bowlY}) scale(${bowlScale}) translate(${-BOWL.w / 2} 0)`}>
      <image href={staticFile("proof/bowl.png")} width={BOWL.w} height={BOWL.h} clipPath={clip} />
    </g>
  );

  return (
    <AbsoluteFill>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <defs>
          <radialGradient id="studio" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="#FBF6EC" />
            <stop offset="60%" stopColor="#F1E8D8" />
            <stop offset="100%" stopColor="#E2D5BF" />
          </radialGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <clipPath id="lip">
            <path d={`M${rimCx - rimRx},${rimCy} A${rimRx},${rimRy} 0 0 0 ${rimCx + rimRx},${rimCy} L${BOWL.w},${BOWL.h + 10} L0,${BOWL.h + 10} Z`} />
          </clipPath>
        </defs>
        <rect width="1920" height="1080" fill="url(#studio)" />
        <g transform={`translate(960 540) scale(${push}) translate(-960 -540)`}>
          {/* contact shadow under the bowl */}
          <ellipse cx="975" cy={bowlY + BOWL.h * bowlScale - 8} rx={BOWL.w * 0.36 * bowlScale} ry="26" fill="#5A4630" opacity="0.32" filter="url(#soft)" />
          {bowl()}
          {LAYERS.map((layer, i) => {
            const a = apart[i];
            const x = layer.rest.x + (layer.slot.x - layer.rest.x) * a;
            const y = layer.rest.y + (layer.slot.y - layer.rest.y) * a + Math.sin(frame / 14 + i) * 4 * a;
            const rot = layer.rest.rot + (layer.slot.rot - layer.rest.rot) * a;
            const w = layer.w * (1 + 0.08 * a);
            const h = w * layer.ratio * layer.squash;
            const shadow = `drop-shadow(0px ${6 + a * 34}px ${8 + a * 22}px rgba(70, 50, 30, ${0.38 - a * 0.12}))`;
            return (
              <g key={layer.id} transform={`translate(${x} ${y}) rotate(${rot})`} style={{ filter: shadow }}>
                {(layer.copies ?? []).map((c, k) => (
                  <image key={k} href={staticFile(layer.src)} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" transform={`translate(${c.dx} ${c.dy}) scale(${(c.flip ? -1 : 1) * (c.scale ?? 1)} ${c.scale ?? 1})`} />
                ))}
                <image href={staticFile(layer.src)} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" />
              </g>
            );
          })}
          {bowl("url(#lip)")}
          {sauce > 0 &&
            STRANDS.map((strand, k) => {
              const t = Math.min(1, Math.max(0, sauce * 1.3 - k * 0.3));
              const d = strandD(strand);
              return (
                <g key={k} style={{ filter: "drop-shadow(0px 3px 2px rgba(80, 50, 30, 0.35))" }}>
                  <path d={d} fill="none" stroke="#C88A66" strokeWidth={9 - k * 2} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
                  <path d={d} fill="none" stroke="#F2CBA8" strokeWidth={6 - k * 1.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
                  <path d={d} fill="none" stroke="#FFF7EC" strokeWidth="1.6" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} transform="translate(-1 -2)" opacity="0.85" />
                </g>
              );
            })}
          {/* labels while pulled apart */}
          {LAYERS.map((layer, i) => {
            const show = interpolate(frame, [118 + (n - 1 - i) * 8, 138 + (n - 1 - i) * 8, 200, 215], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            if (show <= 0) return null;
            const y = layer.slot.y;
            return (
              <g key={`l-${layer.id}`} opacity={show} transform={`translate(${(1 - show) * 30} 0)`}>
                <path d={`M${layer.slot.x + layer.w * 0.55},${y} H1290`} stroke="#3B3127" strokeWidth="1.5" strokeDasharray="2 5" />
                <circle cx="1290" cy={y} r="4" fill="#3B3127" />
                <text x="1312" y={y + 4} fontFamily={SERIF} fontSize="46" fill="#2B231B">
                  {layer.label}
                </text>
                <text x="1314" y={y + 40} fontFamily={MONO} fontSize="22" fill="#7A6A58" letterSpacing="1">
                  {layer.amount}
                </text>
              </g>
            );
          })}
        </g>
        <g opacity={title}>
          <text x="120" y="160" fontFamily={SERIF} fontSize="84" fill="#2B231B">
            Smash Burger Bowl
          </text>
          <text x="124" y="208" fontFamily={MONO} fontSize="24" fill="#7A6A58" letterSpacing="2">
            57 G PROTEIN · 30 MIN · LMDAV.COM/RECIPES
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
}

export function ProductShot() {
  return (
    <CameraMotionBlur shutterAngle={180} samples={6}>
      <Scene />
    </CameraMotionBlur>
  );
}
