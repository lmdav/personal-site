import Image from "next/image";
import Link from "next/link";

type Project = {
  number: string;
  role: string;
  company: string;
  location: string;
  dates: string;
  title: string;
  body: string;
  metrics: string[];
  status: "LIVE" | "ACTIVE" | "COMPLETED" | "SELECTED";
  href?: string;
  accent: string; // CSS var or hex
};

const PROJECTS: Project[] = [
  {
    number: "/01",
    role: "Founder",
    company: "Stayza",
    location: "Santa Cruz, CA",
    dates: "2025 — Present",
    title: "Boutique-grade software for small, design-led properties.",
    body: "Building the hotel tech stack I couldn't find — precise enough for a chain, considered enough for a twelve-room inn. Currently in private beta with operators who care about the texture of a stay.",
    metrics: [
      "Private beta with real properties",
      "Full-stack: bookings, ops, guest experience",
    ],
    status: "LIVE",
    href: "https://trystayza.com",
    accent: "var(--color-mint)",
  },
  {
    number: "/02",
    role: "Marketing Lead",
    company: "Red Bull",
    location: "Santa Cruz, CA",
    dates: "April 2025 — Present",
    title: "Leading regional marketing and partnerships for Red Bull Santa Cruz.",
    body: "Owning sales operations across 50+ beverage, sports, and university accounts. Selected to lead Red Bull Basement — one of the world's largest tech entrepreneur events.",
    metrics: [
      "50+ accounts across three verticals",
      "New revenue in 80% of accounts",
      "$100M+ Silicon Valley partner pipeline",
    ],
    status: "ACTIVE",
    accent: "var(--color-dynamo)",
  },
  {
    number: "/03",
    role: "Founder, VCIC Lead",
    company: "Santa Cruz Venture Capital Club",
    location: "UC Santa Cruz",
    dates: "October 2025 — Present",
    title: "Founded UCSC's VC club and led the school's best-ever VCIC finish.",
    body: "Selected to represent UCSC in the world's largest venture capital competition. Finished 3rd — the best score in university history. Built the selection and training pipeline from scratch.",
    metrics: [
      "3rd place, VCIC global — UCSC record",
      "Vetted 250 candidates, selected top 10",
      "Raised $6,000 to fund competition travel",
    ],
    status: "ACTIVE",
    accent: "var(--color-lumen)",
  },
  {
    number: "/04",
    role: "Founder",
    company: "Close OX",
    location: "Santa Cruz, CA",
    dates: "January 2025 — October 2025",
    title: "AI automation agency — $10K MRR in two months.",
    body: "Built end-to-end workflow automations for real estate and home service clients. Managed a team of three interns. Sunset after shifting focus full-time to Stayza.",
    metrics: [
      "$10K MRR within 2 months of launch",
      "Conversion rates up to +40%",
      "Lead flow up to +150%",
    ],
    status: "COMPLETED",
    accent: "var(--color-seraph)",
  },
  {
    number: "/05",
    role: "Affiliate Partner",
    company: "Acquisition.com",
    location: "Remote / Nevada",
    dates: "July 2025 — August 2025",
    title: "Top 50 global performer, invited to HQ by Alex Hormozi.",
    body: "Selected as a top 50 global performer and personally invited to Acquisition.com HQ in Nevada for a private workshop with founder Alex Hormozi — typically a $5,000/person event.",
    metrics: [
      "Top 50 of a global affiliate cohort",
      "Private HQ workshop with Alex Hormozi",
    ],
    status: "SELECTED",
    accent: "var(--color-acid)",
  },
  {
    number: "/06",
    role: "Owner & Operator",
    company: "OPW LLC",
    location: "Lakeport, CA",
    dates: "August 2022 — August 2024",
    title: "Scaled a home services business to $150K ARR — in high school.",
    body: "Built B2B and B2C marketing, partnership development, and operational automation. Established exclusive referral relationships with contractors across a 60-mile radius.",
    metrics: [
      "$150K ARR, built while in high school",
      "Client retention +65%",
      "Lead conversion +70%",
    ],
    status: "COMPLETED",
    accent: "#ffffff",
  },
];

export default function ProjectsPage() {
  return (
    <main className="min-h-screen w-full overflow-x-clip bg-black text-white">
      <AnnouncementBar />
      <Nav />
      <Hero />
      <ProjectList />
      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Announcement bar — reused                                           */
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
/* Nav — reused                                                        */
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
          <Link href="/projects" className="label nav-glow text-white transition-colors">
            PROJECTS
          </Link>
          <Link href="/#approach" className="label text-white/60 transition-colors hover:text-white">
            APPROACH
          </Link>
          <Link href="/#about" className="label text-white/60 transition-colors hover:text-white">
            ABOUT
          </Link>
        </div>

        <Link
          href="/#contact"
          className="label inline-flex h-[38px] items-center bg-white px-3 text-black"
        >
          CONTACT
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero — page title + intro                                           */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.5) 0.6px, transparent 0.8px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 75% 55%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 75% 55%, black 40%, transparent 85%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1800px] px-6 pb-20 pt-20 md:px-16 md:pb-24 md:pt-28">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <span className="section-tag text-white/60">/00 — SELECTED WORK</span>
          <span className="section-tag text-white/60">
            2022 — {new Date().getFullYear()}
          </span>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-12">
          <div className="col-span-1 md:col-span-9">
            <p className="label-sm mb-5 text-white/60">THE VENTURES</p>
            <h1 className="display-serif text-[clamp(2.25rem,7vw,7rem)] leading-[1] text-white">
              Six projects,
              <br />
              <em className="text-white/85">one throughline</em>.
            </h1>
          </div>
          <div className="col-span-1 flex items-end md:col-span-3">
            <p className="font-serif text-[18px] leading-[1.3] text-white/70">
              Every one of these started with the same impulse — build the
              thing the market said was too hard for someone my age to build.
              Some are live. Some sunset. All real.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Project list — stacked editorial cards                              */
/* ------------------------------------------------------------------ */

function ProjectList() {
  return (
    <section className="w-full bg-black">
      <div className="mx-auto w-full max-w-[1800px] px-6 pb-24 md:px-16 md:pb-32">
        <ul>
          {PROJECTS.map((p, i) => (
            <li key={p.number}>
              <ProjectCard project={p} isFirst={i === 0} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  isFirst,
}: {
  project: Project;
  isFirst: boolean;
}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    project.href ? (
      <Link
        href={project.href}
        className="group block"
        target={project.href.startsWith("http") ? "_blank" : undefined}
        rel={project.href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </Link>
    ) : (
      <div className="group block">{children}</div>
    );

  return (
    <Wrapper>
      <div
        className={`grid grid-cols-1 gap-6 border-b border-white/12 py-10 transition-colors md:grid-cols-12 md:gap-10 md:py-20 ${
          isFirst ? "border-t border-white/12" : ""
        } ${project.href ? "group-hover:bg-white/[0.02]" : ""}`}
      >
        {/* Number + status */}
        <div className="col-span-1 flex flex-row items-baseline justify-between md:col-span-2 md:flex-col md:items-start md:justify-start md:gap-6">
          <span className="section-tag text-white/50">{project.number}</span>
          <span
            className="label inline-flex items-center gap-2"
            style={{ color: project.accent }}
          >
            <span
              aria-hidden
              className={`inline-block h-[6px] w-[6px] rounded-full ${
                project.status === "LIVE" ? "live-dot" : ""
              }`}
              style={
                project.status === "LIVE"
                  ? undefined
                  : { backgroundColor: project.accent }
              }
            />
            {project.status}
          </span>
        </div>

        {/* Main copy */}
        <div className="col-span-1 md:col-span-7">
          <div className="flex items-baseline gap-3 text-white/50">
            <span className="label-sm">{project.role.toUpperCase()}</span>
            <span className="label-sm">·</span>
            <span className="label-sm text-white/80">
              {project.company.toUpperCase()}
            </span>
          </div>

          <h2 className="display-serif mt-5 text-[clamp(1.5rem,2.8vw,2.5rem)] text-white">
            {project.title}
          </h2>

          <p className="mt-5 max-w-[720px] font-serif text-[17px] leading-[1.35] text-white/75">
            {project.body}
          </p>

          <ul className="mt-7 flex flex-col gap-2">
            {project.metrics.map((m) => (
              <li
                key={m}
                className="label-sm flex items-center gap-3 text-white/70"
              >
                <span
                  aria-hidden
                  className="inline-block h-px w-6"
                  style={{ backgroundColor: project.accent }}
                />
                {m.toUpperCase()}
              </li>
            ))}
          </ul>
        </div>

        {/* Meta */}
        <div className="col-span-1 flex flex-col items-start gap-5 md:col-span-3 md:items-end md:text-right">
          <div>
            <p className="label-sm text-white/50">DATES</p>
            <p className="mt-2 font-serif text-[15px] text-white">
              {project.dates}
            </p>
          </div>
          <div>
            <p className="label-sm text-white/50">LOCATION</p>
            <p className="mt-2 font-serif text-[15px] text-white">
              {project.location}
            </p>
          </div>
          {project.href && (
            <span className="label inline-flex items-center gap-2 text-white transition-colors group-hover:text-[var(--color-acid)]">
              VISIT
              <Arrow className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

/* ------------------------------------------------------------------ */
/* Footer — simplified for this page                                   */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer id="contact" className="w-full bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-[1800px] px-6 pb-20 pt-20 md:px-16 md:pb-24 md:pt-24">
        <div className="mb-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-8 md:mb-16">
          <span className="section-tag text-white/60">/99 — GET IN TOUCH</span>
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
                { label: "HOME", href: "/" },
              ]}
            />
          </div>
        </div>

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
          <span className="label-sm">
            © {new Date().getFullYear()} LIAM DAVIS
          </span>
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
                className="label-sm whitespace-nowrap text-white/80 transition-colors hover:text-white"
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
