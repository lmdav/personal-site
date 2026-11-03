"use client";

import { useRef, type ReactNode } from "react";
import { CookModeToggle } from "@/components/cook-mode";

/**
 * Phone only: a bar that stays at the bottom of the screen while the steps
 * are in view, with a button that opens the ingredients over the steps, so
 * the cook never loses their place.
 */
export function IngredientsSheet({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <div className="print-hidden sticky bottom-4 z-30 mt-10 flex justify-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="inline-flex h-12 items-center border border-white bg-white px-5 text-[14px] uppercase tracking-[0.08em] text-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
        >
          Ingredients
        </button>
        <CookModeToggle className="h-12 bg-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]" />
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="ingredients-sheet-title"
        data-lenis-prevent
        // A tap on the dimmed backdrop lands on the dialog itself and closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="print-hidden m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain bg-black p-0 text-white backdrop:bg-[rgba(0,0,0,0.7)]"
      >
        <div className="px-6 pb-10 pt-4">
          <div className="sticky top-0 -mx-6 flex items-center justify-between bg-black px-6 py-2">
            <h2 id="ingredients-sheet-title" className="section-tag text-white/60">
              INGREDIENTS
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="inline-flex h-11 items-center border border-white/30 px-4 text-[13px] uppercase tracking-[0.08em] text-white"
            >
              Close
            </button>
          </div>
          {children}
        </div>
      </dialog>
    </>
  );
}
