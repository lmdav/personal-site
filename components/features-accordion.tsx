"use client";

import Image from "next/image";
import { PinSection } from "@/components/pin-section";

type Skill = {
  n: string;
  label: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
};

const SKILLS: Skill[] = [
  {
    n: "01",
    label: "GTM & STRATEGY",
    title: "Sales pipeline engineering, from cold to closed.",
    body: "Two revenue-generating businesses before twenty — OPW to $150K ARR in high school, Close OX to $10K MRR in two months. The variable was never product. It was the path to the first dollar.",
    image: "/skills/01-chess.png",
    imageAlt: "Dithered illustration of a chessboard",
  },
  {
    n: "02",
    label: "BUILD & AUTOMATE",
    title: "Front-end dev and agentic automation.",
    body: "React and Next.js on the ship side, n8n and Zapier on the plumbing side, Cursor and Claude everywhere in between. I treat every workflow like code — versioned, tested, boring on purpose.",
    image: "/skills/02-robot.png",
    imageAlt: "Dithered illustration of a robotic arm",
  },
  {
    n: "03",
    label: "CRM & DATA",
    title: "HubSpot, GoHighLevel, and lightweight custom schemas.",
    body: "A CRM is only as good as the rep running it. I design data models and automations that make the next action obvious — no dashboards nobody opens, no stale pipelines nobody trusts.",
    image: "/skills/03-magnifier.png",
    imageAlt: "Dithered illustration of a magnifying glass on a grid",
  },
  {
    n: "04",
    label: "CREATIVE & AI MARKETING",
    title: "Midjourney, Photoshop, and a real editorial eye.",
    body: "Marketing that looks like it came from a five-person brand team, because visual quality is a proxy for everything else. Prompt engineering, brand systems, and content that actually converts.",
    image: "/skills/04-brain.png",
    imageAlt: "Dithered illustration of a human brain",
  },
];

const TOOLS = [
  "NOTION",
  "ZAPIER",
  "CURSOR",
  "n8n",
  "HIGH LEVEL",
  "MIDJOURNEY",
  "PHOTOSHOP",
  "ILLUSTRATOR",
  "HUBSPOT",
];

export function FeaturesAccordion() {
  return (
    <PinSection
      id="work"
      viewports={SKILLS.length}
      className="w-full bg-[var(--color-lumen)]"
      innerClassName="bg-[var(--color-lumen)]"
    >
      {({ progress }) => {
        // Reveal phase (0 → 0.15): a solid blue overlay sits on top of the
        // already-positioned content and dissipates to reveal the headline +
        // accordion underneath. No translate — the content never moves.
        const revealEnd = 0.15;
        const overlayOpacity = Math.max(0, 1 - progress / revealEnd);

        // Skill cycling — one quarter of the pin range per skill.
        const dwell = Math.max(0, Math.min(0.9999, progress));
        const activeIdx = Math.min(
          SKILLS.length - 1,
          Math.floor(dwell * SKILLS.length),
        );

        return (
          <div className="relative flex h-full w-full flex-col text-white">
            {/* Skill illustration — crossfades with the active row. Sits in
                the right half of the panel behind the text, large and very
                lightly perceptible so it tints into the blue rather than
                competing with the copy. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] items-center justify-center md:flex"
            >
              <div className="relative h-[80%] w-[90%]">
                {SKILLS.map((s, i) => (
                  <Image
                    key={s.n}
                    src={s.image}
                    alt={s.imageAlt}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 55vw, 0px"
                    className="object-contain transition-opacity duration-700 ease-out"
                    style={{
                      opacity: i === activeIdx ? 0.35 : 0,
                      mixBlendMode: "multiply",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-16 pt-24 pb-10">
              {/* Section tag — fixed at top */}
              <p className="section-tag text-white/70">
                /02 — SKILLS & TOOLS
              </p>

              {/* Centered block — headline + accordion + tools.
                  Constrained to the left ~55% on md+ so the accordion
                  dividers don't bleed into the right-side image column. */}
              <div className="flex flex-1 flex-col justify-center gap-10 py-8 md:max-w-[55%]">
                <div>
                  <h2 className="display-sans text-[clamp(1.75rem,4vw,3.75rem)] leading-[1.02] text-white">
                    Built across the stack —
                    <br />
                    <em className="font-serif not-italic text-white/90">
                      from GTM to AI.
                    </em>
                  </h2>
                </div>

                {/* Accordion + tools strip */}
                <div className="flex w-full flex-col">
                <div className="flex w-full flex-col">
                  {SKILLS.map((s, i) => {
                    const isActive = i === activeIdx;
                    const rowFill = Math.max(
                      0,
                      Math.min(1, dwell * SKILLS.length - i),
                    );
                    return (
                      <div key={s.n} className="w-full">
                        {/* Per-row progress bar — sequential fill */}
                        <div
                          aria-hidden
                          className="relative h-px w-full bg-white/25"
                        >
                          <div
                            className="absolute inset-y-0 left-0 bg-white"
                            style={{ width: `${rowFill * 100}%` }}
                          />
                        </div>

                        {/* Row header */}
                        <div className="flex items-baseline gap-10 py-4">
                          <span
                            className={`label transition-colors duration-500 ${
                              isActive ? "text-white" : "text-white/45"
                            }`}
                          >
                            {s.n}
                          </span>
                          <span
                            className={`label transition-colors duration-500 ${
                              isActive ? "text-white" : "text-white/65"
                            }`}
                          >
                            {s.label}
                          </span>
                        </div>

                        {/* Active body — conditionally rendered so nothing
                            ever overlaps mid-transition. */}
                        {isActive && (
                          <div className="flex flex-col gap-3 pb-5 pl-0 sm:pl-[72px]">
                            <h3 className="display-serif max-w-[900px] text-[clamp(1.15rem,2vw,1.6rem)] leading-[1.15] text-white">
                              {s.title}
                            </h3>
                            <p className="max-w-[680px] font-serif text-[14px] leading-[1.35] text-white/80">
                              {s.body}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div aria-hidden className="h-px w-full bg-white/25" />
                </div>

                {/* Tools strip */}
                <div className="mt-8 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                  <span className="label-sm text-white/55">TOOLS —</span>
                  {TOOLS.map((t, i) => (
                    <span key={t} className="label text-white/85">
                      {t}
                      {i < TOOLS.length - 1 && (
                        <span className="ml-5 text-white/30">·</span>
                      )}
                    </span>
                  ))}
                </div>
                </div>
              </div>
            </div>

            {/* Dissipating blue overlay — covers the content AND the image
                column at the start of the pin, then fades out as you scroll
                to reveal both in place. Must sit above both `z-10` content
                and the image layer (default stacking), hence `z-20`. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 bg-[var(--color-lumen)]"
              style={{
                opacity: overlayOpacity,
                willChange: "opacity",
              }}
            />
          </div>
        );
      }}
    </PinSection>
  );
}
