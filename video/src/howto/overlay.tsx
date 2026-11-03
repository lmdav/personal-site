// The flat layer over the 3D scenes: captions, the title, timer chips, and the sauce's
// ingredient list. Large, high-contrast type so it reads on a phone or a TV, laid out
// again for the vertical cut rather than cropped.
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BACKDROP } from "../three/Studio";
import { MONO, SERIF } from "../theme";

const INK = "#17120D";
const SOFT = "#5E4F3F";
const useTall = () => {
  const { width, height } = useVideoConfig();
  return height > width;
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** One caption per narration beat, each shown from its beat until the next. */
export function Captions({ lines, beats, len }: { lines: string[]; beats: number[]; len: number }) {
  const frame = useCurrentFrame();
  const tall = useTall();
  const i = beats.filter((b) => frame >= b - 4).length - 1;
  if (i < 0) return null;
  const start = beats[i] - 4;
  const end = i + 1 < beats.length ? beats[i + 1] - 4 : len - 2;
  // Fade in on the first beat and out after the last; between beats the text just changes.
  const show = interpolate(frame, [start, start + 6, end - 5, end], [i === 0 ? 0 : 1, 1, 1, i + 1 < beats.length ? 1 : 0], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: tall ? 250 : 60, display: "flex", justifyContent: "center", opacity: show }}>
      <div
        style={{
          maxWidth: tall ? 960 : 1560,
          padding: tall ? "22px 34px" : "20px 40px",
          borderRadius: 20,
          backgroundColor: "rgba(255, 252, 246, 0.96)",
          border: "2px solid rgba(43, 35, 27, 0.14)",
          boxShadow: "0 6px 30px rgba(60, 40, 20, 0.14)",
          fontFamily: SERIF,
          fontSize: tall ? 64 : 58,
          lineHeight: 1.16,
          color: INK,
          textAlign: "center",
        }}
      >
        {lines[i]}
      </div>
    </div>
  );
}

/** The recipe's name and headline facts, on the left of the frame. */
export function TitleBlock({ show, facts }: { show: number; facts: string[] }) {
  const tall = useTall();
  if (show <= 0) return null;
  const place = tall ? { left: 0, right: 0, top: 150, textAlign: "center" as const } : { left: 130, top: 360 };
  return (
    <div style={{ position: "absolute", ...place, opacity: show, transform: `translateY(${(1 - show) * 16}px)` }}>
      <div style={{ fontFamily: SERIF, fontSize: tall ? 112 : 104, color: INK, lineHeight: 1 }}>Smash Burger Bowl</div>
      <div style={{ fontFamily: MONO, fontSize: tall ? 30 : 27, color: SOFT, letterSpacing: 2, marginTop: 24, lineHeight: 1.7 }}>
        {facts.map((f) => (
          <div key={f}>{f}</div>
        ))}
      </div>
    </div>
  );
}

/** A small label in the top left for a time or temperature, like "AIR-FRY 400°F". A
 * ring fills as `progress` goes from 0 to 1. */
export function Chip({ text, show, progress }: { text: string; show: number; progress?: number }) {
  const tall = useTall();
  if (show <= 0) return null;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <div
      style={{
        position: "absolute",
        left: tall ? 60 : 110,
        top: tall ? 110 : 96,
        opacity: show,
        transform: `translateY(${(1 - show) * -12}px)`,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 24px",
        borderRadius: 40,
        backgroundColor: "rgba(250, 246, 238, 0.9)",
        boxShadow: "0 4px 20px rgba(60, 40, 20, 0.1)",
        fontFamily: MONO,
        fontSize: tall ? 30 : 28,
        letterSpacing: 2,
        color: INK,
      }}
    >
      {progress !== undefined && (
        <svg width={38} height={38} viewBox="0 0 38 38">
          <circle cx={19} cy={19} r={r} fill="none" stroke="#E2D6C2" strokeWidth={5} />
          <circle cx={19} cy={19} r={r} fill="none" stroke="#B5552E" strokeWidth={5} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} transform="rotate(-90 19 19)" />
        </svg>
      )}
      {text}
    </div>
  );
}

/** A list that grows as each ingredient goes in: an amount and a name per line. */
export function IngredientList({ rows }: { rows: { amount: string; name: string; show: number }[] }) {
  const tall = useTall();
  return (
    <div style={{ position: "absolute", left: tall ? 120 : 1130, top: tall ? 880 : 190 }}>
      {rows.map((row) =>
        row.show <= 0 ? null : (
          <div key={row.name} style={{ display: "flex", alignItems: "baseline", gap: 22, marginBottom: tall ? 12 : 20, opacity: row.show, transform: `translateX(${(1 - row.show) * 30}px)` }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: 2, color: SOFT, width: 130, textAlign: "right" }}>{row.amount}</div>
            <div style={{ fontFamily: SERIF, fontSize: 48, color: INK, lineHeight: 1.05 }}>{row.name}</div>
          </div>
        ),
      )}
    </div>
  );
}

/** Fades the scene in from, or out to, the studio's cream. */
export function Fade({ len, fadeIn, fadeOut }: { len: number; fadeIn: boolean; fadeOut: boolean }) {
  const frame = useCurrentFrame();
  const a = Math.max(fadeIn ? interpolate(frame, [0, 9], [1, 0], { ...clamp, easing: Easing.out(Easing.quad) }) : 0, fadeOut ? interpolate(frame, [len - 9, len - 1], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) }) : 0);
  if (a <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, backgroundColor: BACKDROP, opacity: a }} />;
}
