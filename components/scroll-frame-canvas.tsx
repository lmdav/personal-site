"use client";

import { useEffect, useRef, useState } from "react";

type ScrollFrameCanvasProps = {
  /** 0..1 scroll progress (from a PinSection render-prop) */
  progress: number;
  /** total frame count */
  frameCount: number;
  /** path pattern — `{n}` is replaced with the zero-padded frame index */
  framePath: (index: number) => string;
  /** image intrinsic size (square) in px */
  size?: number;
  className?: string;
};

/**
 * Scroll-scrubbed frame sequence rendered into a <canvas>.
 *
 * Preloads every frame on mount into an off-DOM Image array, then draws the
 * active frame into the canvas whenever `progress` changes. Drawing to canvas
 * (vs swapping <img> src) avoids flicker and gives crisp scrubbing.
 */
export function ScrollFrameCanvas({
  progress,
  frameCount,
  framePath,
  size = 1080,
  className,
}: ScrollFrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);

  // Preload all frames once
  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        if (cancelled) return;
        loaded += 1;
        setLoadedCount(loaded);
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded += 1;
        setLoadedCount(loaded);
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;

    return () => {
      cancelled = true;
    };
  }, [frameCount, framePath]);

  // Draw the active frame whenever progress or loaded count changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const idx = Math.max(
      0,
      Math.min(frameCount - 1, Math.floor(progress * frameCount)),
    );
    const img = imagesRef.current[idx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, [progress, frameCount, loadedCount]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      aria-hidden
    />
  );
}
