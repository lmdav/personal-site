"use client";

import { useLenis } from "lenis/react";
import { useEffect, useState, type RefObject } from "react";

/**
 * Scroll-progress driver for a pinned tall section.
 *
 * Returns 0..1 based on how far the element's box has scrolled through the
 * viewport, clamped to the span when the inner `sticky` child would be pinned:
 *
 *   0 → top of the tall parent just reached the top of the viewport
 *   1 → bottom of the tall parent just reached the bottom of the viewport
 *
 * Drives scroll-linked UI inside a <PinSection> without any animation library.
 * Uses the Lenis scroll event so values update smoothly during smooth-scroll
 * interpolation; falls back to native scroll + resize otherwise.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  options?: {
    /**
     * Start progress earlier by this many viewport heights.
     * e.g. 1 → progress begins ticking when the element's top is still
     * one viewport below the top of the viewport (i.e. as the prior
     * section is scrolling off). Default 0.
     */
    startOffset?: number;
  },
) {
  const [progress, setProgress] = useState(0);
  const lenis = useLenis();
  const startOffset = options?.startOffset ?? 0;

  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const h = rect.height;
      const vh = window.innerHeight;
      const start = top - vh * startOffset;
      const end = top + Math.max(1, h - vh);
      const range = Math.max(1, end - start);
      const p = (window.scrollY - start) / range;
      setProgress(p < 0 ? 0 : p > 1 ? 1 : p);
    };

    compute();

    // Always listen to native scroll + resize so programmatic
    // `window.scrollTo` calls still update progress. When Lenis is
    // active its smooth-scroll event provides the interpolated updates.
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);

    if (lenis) {
      lenis.on("scroll", compute);
      return () => {
        lenis.off("scroll", compute);
        window.removeEventListener("scroll", compute);
        window.removeEventListener("resize", compute);
      };
    }

    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [lenis, ref, startOffset]);

  return progress;
}
