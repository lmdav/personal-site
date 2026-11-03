"use client";

/** Opens the browser's print dialog. The print stylesheet handles the layout. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 items-center border border-white/30 px-3 text-[13px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white hover:text-black"
    >
      Print
    </button>
  );
}
