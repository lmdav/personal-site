"use client";

import { ReactLenis, useLenis } from "lenis/react";
import Snap from "lenis/snap";
import { useEffect, type ReactNode } from "react";

/**
 * Registers every `[data-snap-section]` element as a Lenis snap target.
 * Runs once Lenis is ready. Mounts underneath the <ReactLenis> provider so
 * `useLenis()` returns the instance.
 */
function SnapSetup() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    // Honor reduced-motion: skip snap entirely for users who opted out.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const snap = new Snap(lenis, {
      type: "proximity",
      distanceThreshold: "20%",
      debounce: 450,
      duration: 1.1,
    });

    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-snap-section]"),
    );
    const removers = elements.map((el) =>
      snap.addElement(el, { align: ["start"] }),
    );

    return () => {
      removers.forEach((remove) => remove());
      snap.destroy();
    };
  }, [lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,
        duration: 1.2,
        smoothWheel: true,
      }}
    >
      <SnapSetup />
      {children}
    </ReactLenis>
  );
}
