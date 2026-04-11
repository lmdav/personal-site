"use client";

import { useCallback } from "react";
import { PinSection } from "@/components/pin-section";
import { ScrollFrameCanvas } from "@/components/scroll-frame-canvas";

const FRAME_COUNT = 102;

export function AboutSection() {
  const framePath = useCallback((i: number) => {
    const n = String(i + 1).padStart(3, "0");
    return `/about-frames/${n}.jpg`;
  }, []);

  return (
    <PinSection
      id="about"
      viewports={2.5}
      scrollStartOffset={1}
      className="w-full bg-black text-white"
    >
      {({ progress }) => (
        <div className="relative flex h-full w-full flex-col">
          <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-16 pt-24 pb-10">
            <div className="flex items-baseline justify-between border-t border-white/10 pt-8">
              <span className="section-tag text-white/60">/07 — ABOUT</span>
              <span className="section-tag text-white/60">
                THE SHORT VERSION
              </span>
            </div>

            <div className="mt-10 grid flex-1 grid-cols-1 gap-12 md:grid-cols-12 md:items-center">
              {/* Left — scroll-scrubbed frame canvas */}
              <div className="md:col-span-5 md:col-start-1">
                <div className="relative aspect-square w-full max-w-[520px]">
                  <ScrollFrameCanvas
                    progress={progress}
                    frameCount={FRAME_COUNT}
                    framePath={framePath}
                    size={720}
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
              </div>

              {/* Right — editorial quote */}
              <div className="md:col-span-7">
                <p className="display-serif text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.1] text-white">
                  I&apos;m an entrepreneur and AI operator finishing an Econ
                  degree at UCSC a year early.{" "}
                  <span className="text-white/40">
                    In high school I scaled a home services business to $150K
                    ARR; last year I took an AI automation agency from zero to
                    $10K MRR in two months.
                  </span>{" "}
                  Today I lead regional marketing for Red Bull in Santa Cruz,
                  founded the UCSC Venture Capital Club, and spend most of my
                  time building at the intersection of AI, go-to-market, and
                  growth. The work is new every week, and I&apos;m endlessly
                  curious about what it takes to ship something real.
                </p>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-10 md:grid-cols-4">
              <Field label="BASED" value="Santa Cruz, California" />
              <Field label="BACKGROUND" value="Entrepreneur, AI operator" />
              <Field label="STUDYING" value="Econ @ UCSC, class of '26" />
              <Field label="FOCUSED ON" value="AI, go-to-market, growth" />
            </div>
          </div>
        </div>
      )}
    </PinSection>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-white/15 pt-4">
      <p className="label-sm text-white/50">{label}</p>
      <p className="mt-3 font-serif text-[18px] text-white">{value}</p>
    </div>
  );
}
