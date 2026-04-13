"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { PinSection } from "@/components/pin-section";

type Stage = {
  bg: string;
  label: string;
  title: string;
  body: string;
};

const STAGES: Stage[] = [
  {
    bg: "#ffffff",
    label: "/06 - THE THESIS",
    title: "Start before you're ready.",
    body: "I started OPW at fifteen because nobody told me I couldn't. Every real thing since - Close OX, the VC club, Stayza - happened because I stopped waiting for the right moment and just opened the door.",
  },
  {
    bg: "var(--color-mint-pale)",
    label: "/06 - THE THESIS",
    title: "Time is the only asset.",
    body: "Close OX went zero to $10K MRR in two months. OPW went zero to $150K ARR in two years. The variable was never capital or experience - it was the number of reps I could fit into a week. Everything compounds, including you.",
  },
  {
    bg: "var(--color-mint)",
    label: "/06 - THE THESIS",
    title: "Build things people actually use.",
    body: "The difference between a class project and Stayza is that a bad release costs someone their honeymoon. Everything I ship now has to earn that weight - real properties, real guests, real weeks. Otherwise it doesn't go out the door.",
  },
];

export function HospitalityAtScale() {
  return (
    <PinSection
      id="thesis"
      viewports={STAGES.length + 1}
      className="w-full text-black"
    >
      {({ progress }) => {
        const n = STAGES.length;
        const stageIdx = Math.min(n - 1, Math.floor(progress * n));
        const stage = STAGES[stageIdx];

        return (
          <div
            className="flex h-full w-full flex-col"
            style={{
              backgroundColor: stage.bg,
              transition: "background-color 800ms ease",
            }}
          >
            {/* scroll progress bar - black on light bg */}
            <div className="relative h-px w-full shrink-0 bg-black/15">
              <div
                className="absolute inset-y-0 left-0 bg-black"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-6 pt-16 pb-10 md:px-12 md:pt-20 md:pb-12">
              {/* top row - section tag */}
              <div className="flex items-start justify-between">
                <span className="section-tag text-black/60">{stage.label}</span>
                <span className="section-tag text-black/60">
                  SPEED ↔ WEIGHT
                </span>
              </div>

              {/* arched doorframe the oval traces */}
              <ArchedFrame progress={progress} stageIdx={stageIdx} />

              {/* bottom row */}
              <div className="mt-8 flex items-center justify-between pt-4 md:mt-10 md:pt-6">
                <span className="label-sm hidden text-black/60 sm:inline">
                  STARTED YOUNG, COMPOUNDING DAILY.
                </span>
                <span className="flex items-center gap-1.5 sm:ml-4">
                  {STAGES.map((_, i) => (
                    <span
                      key={i}
                      className={`h-[6px] w-[6px] rounded-full transition-colors duration-500 ${
                        i === stageIdx ? "bg-black" : "bg-black/25"
                      }`}
                    />
                  ))}
                </span>
                <span className="label-sm hidden text-black/60 sm:inline">2024 - PRESENT</span>
              </div>
            </div>
          </div>
        );
      }}
    </PinSection>
  );
}

/**
 * Arched doorframe - unique shape (flat bottom, vertical sides, arched top)
 * with a halftone portrait of Liam anchored on the left and the rotating
 * thesis copy on the right. The portrait stays constant across stages so
 * the section reads "this is me, here's what I believe" - only the words
 * change as you scroll. The white background of the dithered PNG drops
 * out on the colored stages via mix-blend-mode: multiply.
 *
 * Uses SVG <path> so we can drive the oval along the border with
 * getPointAtLength() - giving perfectly smooth perimeter tracing tied
 * directly to scroll, no CSS transitions.
 */
function ArchedFrame({
  progress,
  stageIdx,
}: {
  progress: number;
  stageIdx: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ovalRef = useRef<SVGGElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Track container size so the SVG path is drawn in real pixels
  // (no non-uniform stretching of the oval).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drive the oval imperatively every render. No CSS transitions -
  // the scroll progress itself is the animation timeline.
  useLayoutEffect(() => {
    const path = pathRef.current;
    const oval = ovalRef.current;
    if (!path || !oval || dims.w === 0 || dims.h === 0) return;
    const len = path.getTotalLength();
    if (len === 0) return;
    const pt = path.getPointAtLength(progress * len);
    oval.setAttribute(
      "transform",
      `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`,
    );
  });

  const { w, h } = dims;
  // Inset so the stroke + oval tracer don't get clipped at container edges.
  const PAD = 12;
  const innerW = Math.max(0, w - PAD * 2);
  const innerH = Math.max(0, h - PAD * 2);
  // Arch rises ~32% of the frame height (or 45% of width, whichever is less)
  // so the doorframe reads clearly as a door/window silhouette.
  const archHeight = Math.min(innerH * 0.32, innerW * 0.45);
  const shoulder = PAD + archHeight;
  const left = PAD;
  const right = PAD + innerW;
  const top = PAD;
  const bottom = PAD + innerH;
  const midX = PAD + innerW / 2;

  // Path drawn CLOCKWISE starting from the arch peak.
  const d =
    innerW === 0 || innerH === 0
      ? ""
      : `M ${midX} ${top}
         C ${midX + innerW * 0.25} ${top}, ${right} ${top + archHeight * 0.2}, ${right} ${shoulder}
         L ${right} ${bottom}
         L ${left} ${bottom}
         L ${left} ${shoulder}
         C ${left} ${top + archHeight * 0.2}, ${midX - innerW * 0.25} ${top}, ${midX} ${top}
         Z`;

  return (
    <div ref={wrapRef} className="relative mt-8 flex-1">
      {/* SVG frame + oval tracer */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${Math.max(1, w)} ${Math.max(1, h)}`}
        preserveAspectRatio="none"
        overflow="visible"
        aria-hidden
      >
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <g ref={ovalRef}>
          <ellipse cx="0" cy="0" rx="18" ry="7" fill="black" />
        </g>
      </svg>

      {/* Inner content sits inside the arch, inset so it doesn't crash the curve.
          On mobile: stack as column with portrait on top, copy below. */}
      <div
        className="absolute inset-0 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-14"
        style={{
          paddingTop: `${Math.max(40, PAD + archHeight * 0.35)}px`,
          paddingLeft: `${PAD + 16}px`,
          paddingRight: `${PAD + 16}px`,
          paddingBottom: `${PAD + 16}px`,
        }}
      >
        {/* Halftone portrait - constant across stages, white drops out on
            tinted backgrounds via multiply blend. */}
        <div className="relative aspect-square h-[clamp(140px,26vh,440px)] shrink-0 sm:h-[clamp(180px,38vh,440px)]">
          <Image
            src="/brand/headshot-dithered.png"
            alt="Liam Davis"
            fill
            sizes="(max-width: 640px) 180px, 440px"
            className="object-contain"
            style={{ mixBlendMode: "multiply" }}
            priority
          />
        </div>

        {/* Rotating copy */}
        <div className="relative min-w-0 flex-1 text-center sm:text-left">
          {STAGES.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col justify-center"
              style={{
                position: i === stageIdx ? "relative" : "absolute",
                inset: i === stageIdx ? "auto" : "0",
                opacity: i === stageIdx ? 1 : 0,
                transform:
                  i === stageIdx
                    ? "translateY(0)"
                    : `translateY(${(i < stageIdx ? -1 : 1) * 10}px)`,
                transition: "opacity 400ms ease, transform 500ms ease",
                pointerEvents: i === stageIdx ? "auto" : "none",
              }}
              aria-hidden={i !== stageIdx}
            >
              <h2 className="display-serif text-[clamp(1.375rem,3.75vw,3rem)] leading-[1.05] text-black">
                {s.title}
              </h2>
              <p className="mx-auto mt-3 max-w-xl font-serif text-[14px] leading-[1.35] text-black/75 sm:mx-0 sm:mt-4 sm:text-[16px]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
