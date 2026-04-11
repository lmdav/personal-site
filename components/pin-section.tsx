"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useScrollProgress } from "@/components/use-scroll-progress";

type PinSectionChildren =
  | ReactNode
  | ((state: { progress: number }) => ReactNode);

type PinSectionProps = {
  children: PinSectionChildren;
  /**
   * How many viewport heights the outer section should occupy.
   * The sticky inner stays pinned for (viewports - 1) * 100dvh of scrolling.
   * @default 2
   */
  viewports?: number;
  className?: string;
  id?: string;
  style?: CSSProperties;
  /**
   * Extra classes for the inner sticky wrapper (so consumers can add padding
   * or a different background without breaking the pin).
   */
  innerClassName?: string;
  /**
   * Start progress earlier by this many viewport heights. Useful when you
   * want the scroll-linked animation inside the pin to begin scrubbing while
   * the previous section is still scrolling off.
   */
  scrollStartOffset?: number;
};

/**
 * A scroll-pinning primitive in the aaru style:
 *   - outer section is tall (`viewports * 100dvh`) and marked as a snap target
 *   - inner wrapper is `sticky top-0 h-dvh` so its content stays locked in view
 *   - children may be a render prop that receives `{ progress }` (0..1 across
 *     the pinned range) for scroll-linked animations inside the pin
 */
export function PinSection({
  children,
  viewports = 2,
  className,
  id,
  style,
  innerClassName,
  scrollStartOffset,
}: PinSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const progress = useScrollProgress(ref, { startOffset: scrollStartOffset });

  const resolved =
    typeof children === "function" ? children({ progress }) : children;

  return (
    <section
      ref={ref}
      id={id}
      data-snap-section
      className={className}
      style={{ height: `${viewports * 100}dvh`, ...style }}
    >
      <div
        className={`sticky top-0 flex h-dvh w-full flex-col overflow-hidden ${innerClassName ?? ""}`}
      >
        {resolved}
      </div>
    </section>
  );
}
