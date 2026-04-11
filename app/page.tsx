import Image from "next/image";
import Link from "next/link";
import { AboutSection } from "@/components/about-section";
import { FeaturesAccordion } from "@/components/features-accordion";
import { HospitalityAtScale } from "@/components/hospitality-at-scale";
import { QuestionCarousel } from "@/components/question-carousel";

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-black text-white overflow-x-clip">
      <AnnouncementBar />
      <Nav />
      <Hero />
      <FeaturesAccordion />
      <QuestionCarousel />
      <HospitalityAtScale />
      <AboutSection />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Announcement bar — yellow on black                                  */
/* ------------------------------------------------------------------ */

function AnnouncementBar() {
  return (
    <div className="w-full bg-[var(--color-acid)] text-black">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-5 py-3 md:px-7">
        <span className="label truncate">STAYZA IS LIVE IN PRIVATE BETA</span>
        <Link
          href="https://trystayza.com"
          target="_blank"
          rel="noopener noreferrer"
          className="label inline-flex items-center gap-2 border-b border-black pb-[2px]"
        >
          VISIT STAYZA
          <Arrow className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nav — fixed, transparent over hero                                  */
/* ------------------------------------------------------------------ */

function Nav() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-6 py-5 md:px-16">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image
            src="/brand/liam.png"
            alt="Liam Davis"
            width={28}
            height={28}
            priority
            className="h-7 w-7 object-contain"
          />
          <span className="label text-white">LIAM</span>
        </Link>

        <div className="hidden items-center gap-10 md:flex">
          <Link href="/projects" className="label text-white/60 hover:text-white transition-colors">
            PROJECTS
          </Link>
          <Link href="#approach" className="label text-white/60 hover:text-white transition-colors">
            APPROACH
          </Link>
          <Link href="#about" className="label text-white/60 hover:text-white transition-colors">
            ABOUT
          </Link>
        </div>

        <Link
          href="#contact"
          className="label inline-flex h-[38px] items-center bg-white px-3 text-black"
        >
          CONTACT
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — full viewport, dark, big display                             */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section
      data-snap-section
      className="relative w-full overflow-hidden bg-black"
    >
      {/* Subtle particle / dot grid background — CSS only */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.5) 0.6px, transparent 0.8px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 70% 55%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 70% 55%, black 40%, transparent 85%)",
        }}
      />

      {/* Wall-Street style ticker behind the headline */}
      <HeroTicker />

      <div className="relative z-10 mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-6 pt-8 pb-12 md:gap-14 md:px-16 md:pt-10">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="section-tag text-white/60">/01 — INDEPENDENT</span>
          <span className="section-tag text-white/60">SANTA CRUZ, CA / 2026</span>
        </div>

        <div className="max-w-[1400px]">
          <p className="label-sm mb-5 text-white/60">THE PREMISE</p>
          <h1 className="display-sans text-[clamp(2.75rem,9vw,9rem)] leading-[0.95] text-white">
            Operating at
            <br />
            the edge of
            <br />
            <em className="font-serif not-italic text-white/95">
              AI and GTM.
            </em>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-10 border-t border-white/10 pt-6 md:grid-cols-12">
          <p className="label-sm col-span-1 text-white/60 md:col-span-3">
            THE OPERATOR
          </p>
          <p className="col-span-1 max-w-xl font-serif text-[18px] leading-[1.25] text-white/85 md:col-span-6">
            Hi, I&apos;m Liam. Entrepreneur and AI operator finishing an Econ
            degree at UCSC a year early. I&apos;ve scaled two
            revenue-generating businesses before twenty, I lead regional
            marketing for Red Bull in Santa Cruz, and I spend most of my time
            at the intersection of AI, go-to-market, and the messy craft of
            getting something built and bought.
          </p>
          <div className="col-span-1 flex items-end justify-start md:col-span-3 md:justify-end">
            <span className="label-sm inline-flex items-center gap-2 text-white/60">
              SCROLL
              <Arrow className="h-3 w-3 rotate-90" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hero ticker — Wall-Street style scrolling marquee                   */
/* ------------------------------------------------------------------ */

const TICKER_ROW_A = [
  "LIAM DAVIS",
  "STAYZA",
  "CLOSE OX",
  "OPW",
  "SCVCC",
  "RED BULL SC",
  "UCSC ECON '26",
  "AI OPERATOR",
  "ENTREPRENEUR",
];

const TICKER_ROW_B = [
  "STAYZA ▲ PRIVATE BETA",
  "CLOSE OX ▲ $10K MRR",
  "OPW ▲ $150K ARR",
  "SCVCC ▲ FOUNDER",
  "RED BULL ▲ MKT LEAD",
  "SANTA CRUZ ◆ CA",
  "BUILT IN PUBLIC",
];

const TICKER_ROW_C = [
  "LIAM / DAVIS",
  "BOUTIQUE HOSPITALITY",
  "HOTEL TECH",
  "AI + GTM",
  "INDEPENDENT",
  "STAYZA",
  "EST. 2026",
];

function HeroTicker() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-10 overflow-hidden"
    >
      <TickerRow items={TICKER_ROW_A} duration="90s" reverse={false} />
      <TickerRow items={TICKER_ROW_B} duration="130s" reverse={true} />
      <TickerRow items={TICKER_ROW_C} duration="75s" reverse={false} />
    </div>
  );
}

function TickerRow({
  items,
  duration,
  reverse,
}: {
  items: string[];
  duration: string;
  reverse: boolean;
}) {
  // Render 4 copies so translateX(-25%) loops one copy-width seamlessly.
  const copies = [0, 1, 2, 3];
  return (
    <div className="ticker-row">
      <div
        className={`ticker-track ${reverse ? "ticker-track--reverse" : ""}`}
        style={{ animationDuration: duration }}
      >
        {copies.flatMap((copy) =>
          items.map((label, i) => {
            // Alternate between the headshot and the LD monogram so the
            // ticker isn't just Liam's face on repeat.
            const useLogo = (i + copy) % 2 === 1;
            return (
              <span key={`${copy}-${i}`} className="ticker-item">
                <Image
                  src={
                    useLogo
                      ? "/brand/liam.png"
                      : "/brand/headshot-dithered.png"
                  }
                  alt=""
                  width={56}
                  height={56}
                  className={
                    useLogo ? "ticker-mark ticker-mark--logo" : "ticker-mark"
                  }
                  aria-hidden
                />
                <span>{label}</span>
                <span className="ticker-sep">◆</span>
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial quote — dark, big serif manifesto                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer id="contact" className="w-full bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-[1800px] px-6 pb-20 pt-20 md:px-16 md:pb-24 md:pt-24">
        <div className="mb-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-8 md:mb-16">
          <span className="section-tag text-white/60">/08 — GET IN TOUCH</span>
          <span className="section-tag text-white/60">THE DOOR&apos;S OPEN</span>
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-20">
          <div className="col-span-1 md:col-span-7">
            <h2 className="display-serif text-[clamp(2.75rem,8vw,8rem)] leading-[0.95] text-white">
              Say hello.
            </h2>
            <p className="mt-8 max-w-lg font-serif text-[20px] leading-[1.2] text-white/75">
              Building in AI, go-to-market, or growth? I&apos;d love to hear
              from you. Always open to partnerships and good conversation. I
              read every email.
            </p>

            <form
              action="#"
              className="mt-12 flex max-w-md items-stretch border border-white/15"
            >
              <input
                type="email"
                placeholder="YOU@EXAMPLE.COM"
                className="label flex-1 bg-[#0a0a0a] px-3 py-3 text-white placeholder-white/40 outline-none"
              />
              <button
                type="submit"
                className="label inline-flex shrink-0 items-center gap-2 whitespace-nowrap bg-[var(--color-acid)] px-4 text-black"
              >
                JOIN LIST
                <Arrow className="h-3 w-3" />
              </button>
            </form>
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-8 md:col-span-5 md:gap-10">
            <FooterColumn
              heading="DIRECT"
              links={[
                { label: "limdavis@ucsc.edu", href: "mailto:limdavis@ucsc.edu" },
                { label: "linkedin / lmdav", href: "https://www.linkedin.com/in/lmdav" },
                { label: "github / lmdav", href: "https://github.com/lmdav" },
              ]}
            />
            <FooterColumn
              heading="PROJECTS"
              links={[
                { label: "STAYZA", href: "https://trystayza.com" },
                { label: "ALL PROJECTS", href: "/projects" },
                { label: "WRITING (SOON)", href: "#" },
              ]}
            />
          </div>
        </div>

        {/* Giant wordmark */}
        <div className="mt-20 flex items-end justify-between gap-8 border-t border-white/10 pt-10 md:mt-32">
          <div className="flex items-center gap-4 md:gap-8">
            <Image
              src="/brand/liam.png"
              alt="Liam Davis"
              width={160}
              height={160}
              className="h-[clamp(4rem,11vw,10rem)] w-auto object-contain"
            />
            <span className="display-sans text-[clamp(5rem,15vw,14rem)] leading-[0.85] text-white">
              liam
            </span>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between text-white/50">
          <span className="label-sm">© {new Date().getFullYear()} LIAM DAVIS</span>
          <span className="label-sm">BUILT IN PUBLIC</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="label text-white/50">{heading}</p>
      <ul className="mt-6 space-y-3">
        {links.map((l) => {
          const isExternal = /^(https?:|mailto:)/.test(l.href);
          return (
            <li key={l.label}>
              <Link
                href={l.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="label-sm whitespace-nowrap text-white/80 hover:text-white transition-colors"
              >
                {l.label.toUpperCase()}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiny primitives                                                     */
/* ------------------------------------------------------------------ */

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

