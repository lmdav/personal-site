"use client";

/** Opens the browser's print dialog. The print stylesheet handles the layout. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="label inline-flex h-[38px] items-center border border-white/30 px-3 text-white transition-colors hover:bg-white hover:text-black"
    >
      PRINT RECIPE
    </button>
  );
}
