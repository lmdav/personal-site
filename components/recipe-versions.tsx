"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

type Versions = { keys: string[]; labels: string[]; current: number; choose: (i: number) => void };

const VersionsContext = createContext<Versions | null>(null);

// The chosen version lives in the address (?version=sweet-potato), so a shared link
// opens the same version. Changing it fires this event so the page re-reads it.
const CHANGE = "recipe-version-change";
const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
};
const readVersion = () => new URLSearchParams(window.location.search).get("version") ?? "";

/**
 * Shows one version of a recipe at a time, such as small potatoes or sweet potato.
 * `panels` holds one fully rendered recipe per version, in the same order as `keys`
 * and `labels`; the first one is the default.
 */
export function RecipeVersions({ keys, labels, panels }: { keys: string[]; labels: string[]; panels: ReactNode[] }) {
  const version = useSyncExternalStore(subscribe, readVersion, () => "");
  const current = Math.max(0, keys.indexOf(version));
  const choose = (i: number) => {
    const url = new URL(window.location.href);
    if (i === 0) url.searchParams.delete("version");
    else url.searchParams.set("version", keys[i]);
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(CHANGE));
  };
  return <VersionsContext.Provider value={{ keys, labels, current, choose }}>{panels[current]}</VersionsContext.Provider>;
}

/** The buttons that switch between versions. Renders nothing on a recipe with one version. */
export function VersionPicker({ className = "" }: { className?: string }) {
  const versions = useContext(VersionsContext);
  if (!versions) return null;
  return (
    <div role="group" aria-label="Choose a version of this recipe" className={`print-hidden flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <span className="text-[14px] uppercase tracking-[0.06em] text-white/60">Make it with</span>
      <div className="flex flex-wrap gap-2">
        {versions.labels.map((label, i) => (
          <button
            key={versions.keys[i]}
            type="button"
            aria-pressed={i === versions.current}
            onClick={() => versions.choose(i)}
            className={`inline-flex h-11 items-center border px-4 text-[15px] transition-colors ${
              i === versions.current
                ? "border-white bg-white text-black"
                : "border-white/30 text-white hover:bg-white hover:text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
