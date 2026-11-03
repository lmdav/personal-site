import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BG, GRID_MAJOR, GRID_MINOR, HAND, INK, INK2, MONO, RED, SERIF } from "./theme";
import type { Crop, HowToProps } from "./types";

// Scene lengths in frames at 30 fps.
export const TITLE = 120;
export const TOUR = 300;
export const INGREDIENTS = 210;
export const STEP = 105;
export const FINISH = 150;

export function totalFrames(stepCount: number) {
  return TITLE + TOUR + INGREDIENTS + STEP * stepCount + FINISH;
}

const IMG_W = 3200;
const IMG_H = 2200;

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Grid() {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <svg width="100%" height="100%">
        <defs>
          <pattern id="minor" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke={GRID_MINOR} strokeWidth="1" />
          </pattern>
          <pattern id="major" width="120" height="120" patternUnits="userSpaceOnUse">
            <path d="M120 0H0V120" fill="none" stroke={GRID_MAJOR} strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#minor)" />
        <rect width="100%" height="100%" fill="url(#major)" />
        <rect x="28" y="28" width="1864" height="1024" fill="none" stroke={INK} strokeWidth="2" />
      </svg>
    </AbsoluteFill>
  );
}

/** Fades a scene in and out at its edges. */
function Fade({ duration, children }: { duration: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function lerpCrop(a: Crop, b: Crop, t: number): Crop {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    w: a.w + (b.w - a.w) * t,
    h: a.h + (b.h - a.h) * t,
  };
}

/** Shows one region of the blueprint image, scaled to fill a box. */
function BlueprintCrop({ src, crop, width, height }: { src: string; crop: Crop; width: number; height: number }) {
  const scale = Math.min(width / crop.w, height / crop.h);
  const tx = width / 2 - (crop.x + crop.w / 2) * scale;
  const ty = height / 2 - (crop.y + crop.h / 2) * scale;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", backgroundColor: BG }}>
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: IMG_W,
          height: IMG_H,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }}
      />
    </div>
  );
}

const label: CSSProperties = { fontFamily: MONO, color: INK2, letterSpacing: "0.08em", textTransform: "uppercase" };

/* ------------------------------------------------------------------ */
/* Scenes                                                              */
/* ------------------------------------------------------------------ */

function Title({ recipe }: HowToProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 18 } });
  const note = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const facts = [
    `Serves ${recipe.servings}`,
    `${recipe.totalMinutes} min`,
    `${recipe.nutrition.protein} g protein`,
    `${recipe.nutrition.fiber} g fiber`,
  ];
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          border: `3px solid ${INK}`,
          backgroundColor: BG,
          width: 1240,
          transform: `translateY(${(1 - rise) * 80}px)`,
          opacity: rise,
        }}
      >
        <div style={{ padding: "36px 48px 30px", borderBottom: `2px solid ${INK}` }}>
          <div style={{ ...label, fontSize: 26 }}>Liam&apos;s kitchen, recipe drawing</div>
          <div style={{ fontFamily: SERIF, fontSize: 150, lineHeight: 1, color: INK, marginTop: 14 }}>{recipe.title}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {facts.map((f, i) => (
            <div
              key={f}
              style={{
                fontFamily: MONO,
                fontSize: 32,
                color: INK,
                padding: "22px 30px",
                borderLeft: i ? `2px solid ${INK}` : undefined,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 250,
          bottom: 190,
          fontFamily: HAND,
          fontSize: 64,
          color: RED,
          transform: "rotate(-5deg)",
          opacity: note,
        }}
      >
        let&apos;s cook.
      </div>
    </AbsoluteFill>
  );
}

function Tour({ blueprint, tour }: HowToProps) {
  const frame = useCurrentFrame();
  // Hold, move, hold, move... across the tour crops.
  const keys = [0, 40, 100, 130, 190, 220, 270];
  const stops = [0, 0, 1, 1, 2, 2, 3];
  const pos = interpolate(frame, keys, stops, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const i = Math.min(Math.floor(pos), tour.length - 2);
  const crop = lerpCrop(tour[i], tour[i + 1], pos - i);
  const captions = ["The whole drawing", "The bowl from above", "The layers, side on", "The crust"];
  const caption = captions[Math.min(Math.round(pos), captions.length - 1)];
  return (
    <AbsoluteFill>
      <BlueprintCrop src={blueprint} crop={crop} width={1920} height={1080} />
      <div
        style={{
          position: "absolute",
          left: 60,
          bottom: 56,
          backgroundColor: BG,
          border: `2px solid ${INK}`,
          padding: "14px 22px",
          fontFamily: MONO,
          fontSize: 34,
          color: INK,
        }}
      >
        {caption}
      </div>
    </AbsoluteFill>
  );
}

function Ingredients({ recipe }: HowToProps) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ padding: "90px 110px" }}>
      <div style={{ fontFamily: SERIF, fontSize: 96, color: INK, lineHeight: 1 }}>What you need</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          columnGap: 70,
          rowGap: 40,
          marginTop: 46,
        }}
      >
        {recipe.ingredients.map((group, g) => {
          const t = interpolate(frame, [10 + g * 12, 28 + g * 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div key={g} style={{ opacity: t, transform: `translateY(${(1 - t) * 24}px)` }}>
              {group.name && <div style={{ ...label, fontSize: 22, marginBottom: 12 }}>{group.name}</div>}
              {group.items.map((item, j) => (
                <div key={j} style={{ fontFamily: MONO, fontSize: 21, lineHeight: 1.45, color: INK }}>
                  {item.replace(/ \([^)]*\)$/, "")}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Timer({ minutes, size }: { minutes?: number; size: number }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [15, STEP - 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const left = minutes ? Math.round(minutes * 60 * (1 - t)) : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={BG} stroke={GRID_MAJOR} strokeWidth="12" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={INK}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={minutes ? c * t : 0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: size * 0.22, color: INK }}>{minutes ? `${mm}:${ss}` : "Go"}</div>
        <div style={{ ...label, fontSize: size * 0.07, marginTop: 6 }}>{minutes ? `${minutes} min` : "no timer"}</div>
      </div>
    </div>
  );
}

function Step({ props, index }: { props: HowToProps; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { recipe, cues, stepCrops, blueprint } = props;
  const step = recipe.steps[index];
  const crop = stepCrops[index];
  const enter = spring({ frame, fps, config: { damping: 20 } });
  const total = recipe.steps.length;
  return (
    <AbsoluteFill style={{ padding: "110px 110px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 760 }}>
        <div style={{ width: crop ? 860 : 1060, transform: `translateX(${(1 - enter) * -40}px)`, opacity: enter }}>
          <div style={{ ...label, fontSize: 30 }}>
            Step {String(index + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 120, lineHeight: 1, color: INK, marginTop: 22 }}>{step.title}</div>
          <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1.4, color: INK, marginTop: 40 }}>{cues[index]}</div>
        </div>
        {crop ? (
          <div style={{ position: "relative", opacity: enter }}>
            <div style={{ border: `3px solid ${INK}` }}>
              <BlueprintCrop src={blueprint} crop={crop} width={760} height={640} />
            </div>
            <div style={{ position: "absolute", right: -40, bottom: -60 }}>
              <Timer minutes={step.minutes} size={220} />
            </div>
          </div>
        ) : (
          <div style={{ marginRight: 70, opacity: enter }}>
            <Timer minutes={step.minutes} size={420} />
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 110, right: 110, bottom: 90, display: "flex", gap: 12 }}>
        {recipe.steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 10, backgroundColor: i <= index ? INK : GRID_MAJOR }} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Finish({ blueprint, tour }: HowToProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 110px", gap: 80 }}>
      <div style={{ flex: 1, opacity: enter }}>
        <div style={{ fontFamily: SERIF, fontSize: 200, lineHeight: 0.9, color: INK }}>Ready.</div>
        <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1.4, color: INK, marginTop: 40 }}>
          Hot side. Cold side.
          <br />
          Sauce over everything.
        </div>
        <div style={{ ...label, fontSize: 30, marginTop: 60 }}>lmdav.com/recipes</div>
        <div style={{ fontFamily: HAND, fontSize: 56, color: RED, marginTop: 30, transform: "rotate(-3deg)" }}>
          taste test: Grandma, pending
        </div>
      </div>
      <div style={{ border: `3px solid ${INK}`, opacity: enter, transform: `scale(${0.94 + enter * 0.06})` }}>
        <BlueprintCrop src={blueprint} crop={tour[1]} width={760} height={740} />
      </div>
    </AbsoluteFill>
  );
}

/* ------------------------------------------------------------------ */
/* The whole video                                                     */
/* ------------------------------------------------------------------ */

export function HowTo(props: HowToProps) {
  const steps = props.recipe.steps;
  let at = 0;
  const next = (len: number) => {
    const from = at;
    at += len;
    return from;
  };
  return (
    <AbsoluteFill>
      <Grid />
      <Sequence from={next(TITLE)} durationInFrames={TITLE}>
        <Fade duration={TITLE}>
          <Title {...props} />
        </Fade>
      </Sequence>
      <Sequence from={next(TOUR)} durationInFrames={TOUR}>
        <Fade duration={TOUR}>
          <Tour {...props} />
        </Fade>
      </Sequence>
      <Sequence from={next(INGREDIENTS)} durationInFrames={INGREDIENTS}>
        <Fade duration={INGREDIENTS}>
          <Ingredients {...props} />
        </Fade>
      </Sequence>
      {steps.map((_, i) => (
        <Sequence key={i} from={next(STEP)} durationInFrames={STEP}>
          <Fade duration={STEP}>
            <Step props={props} index={i} />
          </Fade>
        </Sequence>
      ))}
      <Sequence from={next(FINISH)} durationInFrames={FINISH}>
        <Fade duration={FINISH}>
          <Finish {...props} />
        </Fade>
      </Sequence>
    </AbsoluteFill>
  );
}
