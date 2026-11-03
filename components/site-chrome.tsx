import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "@/components/arrow-icon";

/** The page the visitor is on, so the nav can highlight it and pick anchor targets. */
export type SitePage = "home" | "projects" | "recipes";

type FooterLink = { label: string; href: string };

/* ------------------------------------------------------------------ */
/* Announcement bar - yellow on black                                  */
/* ------------------------------------------------------------------ */

export function AnnouncementBar() {
  return (
    <div className="w-full bg-[var(--color-acid)] text-black print:hidden">
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
/* Nav - sticky, translucent                                           */
/* ------------------------------------------------------------------ */

export function SiteNav({ current }: { current: SitePage }) {
  // Section anchors live on the home page: stay in-page there, link home elsewhere.
  const anchor = (id: string) => (current === "home" ? `#${id}` : `/#${id}`);
  const linkClass = (active: boolean) =>
    active
      ? "label nav-glow text-white transition-colors"
      : "label text-white/60 transition-colors hover:text-white";

  return (
    <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-md print:hidden">
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
          <Link href="/projects" className={linkClass(current === "projects")}>
            PROJECTS
          </Link>
          <Link href={anchor("approach")} className={linkClass(false)}>
            APPROACH
          </Link>
          <Link href={anchor("about")} className={linkClass(false)}>
            ABOUT
          </Link>
        </div>

        <Link
          href={anchor("contact")}
          className="label inline-flex h-[38px] items-center bg-white px-3 text-black"
        >
          CONTACT
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Footer - contact, link columns, giant wordmark                      */
/* ------------------------------------------------------------------ */

export function SiteFooter({
  tag,
  projectLinks,
  children,
}: {
  /** Numbered section tag shown top left, for example "/99 - GET IN TOUCH". */
  tag: string;
  projectLinks: FooterLink[];
  /** Extra content under the intro paragraph, such as a sign-up form. */
  children?: ReactNode;
}) {
  return (
    <footer id="contact" className="w-full bg-[#0a0a0a] text-white print:hidden">
      <div className="mx-auto max-w-[1800px] px-6 pb-20 pt-20 md:px-16 md:pb-24 md:pt-24">
        <div className="mb-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-8 md:mb-16">
          <span className="section-tag text-white/60">{tag}</span>
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
            {children}
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
            <FooterColumn heading="PROJECTS" links={projectLinks} />
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

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
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
