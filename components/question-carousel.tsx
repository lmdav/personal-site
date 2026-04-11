"use client";

import Link from "next/link";
import { PinSection } from "@/components/pin-section";

type Question = {
  modelTag: string;
  modelColor: string;
  number: string;
  beforeHighlight: string;
  highlight: string;
  afterHighlight: string;
  href: string;
  projectLabel: string;
};

const QUESTIONS: Question[] = [
  {
    modelTag: "BUILD — SHIPPING THINGS",
    modelColor: "var(--color-lumen)",
    number: "/03",
    beforeHighlight: "What's worth building ",
    highlight: "when a nineteen-year-old can build anything",
    afterHighlight: " on a laptop in a week?",
    href: "https://trystayza.com",
    projectLabel: "VIEW STAYZA",
  },
  {
    modelTag: "SCALE — GROWING THINGS",
    modelColor: "var(--color-dynamo)",
    number: "/04",
    beforeHighlight: "How do you scale ",
    highlight: "trust faster than you scale revenue",
    afterHighlight: " — without either one outrunning the other?",
    href: "/projects",
    projectLabel: "VIEW CLOSE OX",
  },
  {
    modelTag: "LEAD — PEOPLE & CAPITAL",
    modelColor: "var(--color-seraph)",
    number: "/05",
    beforeHighlight: "How do you lead people ",
    highlight: "older than you, smarter than you",
    afterHighlight: " — without pretending to be either?",
    href: "/projects",
    projectLabel: "VIEW SCVCC",
  },
];

export function QuestionCarousel() {
  const n = QUESTIONS.length;

  return (
    <PinSection
      id="approach"
      viewports={n + 1}
      className="w-full bg-black text-white"
    >
      {({ progress }) => {
        // Each question owns 1/n of the scroll range. Inside its segment:
        //   - segProgress 0 → 1 drives the bar fill for that segment
        //   - the card stack slides smoothly and continuously — Q_i is
        //     centered at the start of its segment and Q_{i+1} is centered
        //     at the end. At segProgress = 1, the bar is full, activeIdx
        //     flips, and the next segment picks up with its card centered.
        const clamped = Math.max(0, Math.min(0.9999, progress));
        const rawIdx = clamped * n; // 0 → n (exclusive)
        const activeIdx = Math.min(n - 1, Math.floor(rawIdx));
        const segProgress = rawIdx - activeIdx; // 0..1 within active segment

        // Continuous linear slide — no dwell. pos interpolates the full
        // distance between Q_i and Q_{i+1} across each segment.
        const pos = rawIdx;

        return (
          <>
            <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-16 pt-24 pb-16">
            {/* tag swaps based on active question */}
            <div className="flex items-start justify-between">
              <span
                className="section-tag transition-colors duration-500"
                style={{ color: QUESTIONS[activeIdx].modelColor }}
              >
                {QUESTIONS[activeIdx].modelTag}
              </span>
              <span className="section-tag text-white/60">
                {QUESTIONS[activeIdx].number}
              </span>
            </div>

            {/* Segmented scroll progress — one bar per question. Bar i is
                empty before its segment, fills 0→1 during its segment, and
                stays full afterward. Synced to the same rawIdx the card
                stack and tag use. */}
            <div className="mt-6 flex w-full items-center gap-3">
              {QUESTIONS.map((q, i) => {
                const segFill =
                  i < activeIdx ? 1 : i > activeIdx ? 0 : segProgress;
                const isActive = i === activeIdx;
                return (
                  <div
                    key={i}
                    className="relative h-[2px] flex-1 bg-white/20"
                  >
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${segFill * 100}%`,
                        backgroundColor: isActive ? q.modelColor : "#ffffff",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* stacked question cards — text only, button lives below */}
            <div
              className="relative flex-1"
              style={{
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
              }}
            >
              {QUESTIONS.map((q, i) => {
                // Each card sits in the same absolute box; translateY in %
                // of its own height moves the whole stack. Tight spacing
                // (aaru-style): ~22% offset so neighbors ghost just above
                // and below the active question.
                const offset = (i - pos) * 22;
                const distance = Math.abs(i - pos);
                const opacity = Math.max(0, 1 - distance * 0.85);
                return (
                  <div
                    key={i}
                    className="absolute inset-0 flex items-center"
                    style={{
                      transform: `translate3d(0, ${offset}%, 0)`,
                      opacity,
                      willChange: "transform, opacity",
                    }}
                    aria-hidden={i !== activeIdx}
                  >
                    <div className="max-w-[1400px]">
                      <p
                        className="font-serif text-[clamp(1.75rem,4.25vw,3.5rem)] leading-[1.05] text-white"
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {q.beforeHighlight}
                        <span
                          className="relative inline"
                          style={{
                            backgroundImage: `linear-gradient(transparent 80%, ${q.modelColor} 80%, ${q.modelColor} 94%, transparent 94%)`,
                          }}
                        >
                          {q.highlight}
                        </span>
                        {q.afterHighlight}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Single CTA — swaps with the active question so the buttons
                from ghost cards never overlap the active text. Border and
                text tint with the active question's accent color and the
                whole button fills with that color on hover. External hrefs
                open in a new tab so visitors don't lose their place. */}
            <div className="pt-6">
              {(() => {
                const active = QUESTIONS[activeIdx];
                const isExternal = /^(https?:|mailto:)/.test(active.href);
                return (
                  <Link
                    href={active.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="question-cta label inline-flex items-center gap-2 border px-4 py-2"
                    style={
                      {
                        "--q-color": active.modelColor,
                      } as React.CSSProperties
                    }
                  >
                    {active.projectLabel}
                    <Arrow className="h-3 w-3" />
                  </Link>
                );
              })()}
            </div>

            {/* footer row with dot index */}
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <span className="label-sm text-white/60">
                  QUESTIONS I THINK ABOUT DAILY.
                </span>
                <span className="ml-4 flex items-center gap-1.5">
                  {QUESTIONS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-[6px] w-[6px] rounded-full transition-colors duration-500 ${
                        i === activeIdx ? "bg-white" : "bg-white/25"
                      }`}
                    />
                  ))}
                </span>
              </div>
              <span className="label-sm text-white/60">
                {String(activeIdx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
            </div>
            </div>
          </>
        );
      }}
    </PinSection>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      <line x1="2" y1="7" x2="12" y2="7" />
      <polyline points="8,3 12,7 8,11" />
    </svg>
  );
}
