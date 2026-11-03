"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CookMode = {
  on: boolean;
  /** True while the browser is holding a screen wake lock. */
  awake: boolean;
  setOn: (on: boolean) => void;
  done: ReadonlySet<string>;
  toggleDone: (id: string) => void;
};

const CookModeContext = createContext<CookMode | null>(null);

function useCookMode(): CookMode {
  const cook = useContext(CookModeContext);
  if (!cook) throw new Error("Cook mode controls must be inside <CookModeRoot>");
  return cook;
}

/**
 * Wraps a recipe page in its <main>. Cook mode keeps the screen awake where
 * the browser allows it, and globals.css switches the article to large dark
 * text on a light background while `data-cook-mode` is set.
 */
export function CookModeRoot({ className, children }: { className?: string; children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [awake, setAwake] = useState(false);
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!on) return;
    let lock: WakeLockSentinel | undefined;
    let stopped = false;

    const request = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) {
          next.release().catch(() => {});
          return;
        }
        lock = next;
        next.addEventListener("release", () => setAwake(false));
        setAwake(true);
      } catch {
        // Not allowed here (low battery, no permission): cook mode works without it.
      }
    };
    // The browser drops the lock whenever the tab is hidden, so take it again on return.
    const onVisibility = () => {
      if (!lock || lock.released) void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [on]);

  const toggleDone = useCallback((id: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ on, awake, setOn, done, toggleDone }),
    [on, awake, done, toggleDone],
  );

  return (
    <CookModeContext value={value}>
      <main className={className} data-cook-mode={on ? "on" : undefined}>
        {children}
      </main>
    </CookModeContext>
  );
}

export function CookModeToggle({ className = "" }: { className?: string }) {
  const { on, setOn } = useCookMode();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setOn(!on)}
      className={`print-hidden inline-flex h-11 items-center gap-2 border px-3 text-[13px] uppercase tracking-[0.08em] transition-colors ${
        on
          ? "border-white bg-white text-black"
          : "border-white/30 text-white hover:bg-white hover:text-black"
      } ${className}`}
    >
      Cook mode
      <span aria-hidden className="font-medium">
        {on ? "on" : "off"}
      </span>
    </button>
  );
}

/** A one-line explanation that appears while cook mode is on. */
export function CookModeStatus({ className = "" }: { className?: string }) {
  const { on, awake } = useCookMode();
  return (
    <p role="status" className={`print-hidden empty:hidden ${className}`}>
      {on &&
        `${awake ? "Your screen will stay on. " : ""}Tap an ingredient or step to check it off.`}
    </p>
  );
}

/**
 * A list item the cook can tap to check off in cook mode. Outside cook mode
 * it is a plain <li>. Rows that share an `id` share their checked state, so
 * the phone ingredients panel matches the main list.
 */
export function CheckRow({
  id,
  label,
  marker,
  markerClassName = "",
  className = "",
  children,
}: {
  id: string;
  /** What a screen reader announces for the checkbox. */
  label: string;
  /** Shown before the content, such as a dash or a step number. */
  marker: ReactNode;
  markerClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const { on, done, toggleDone } = useCookMode();
  const checked = on && done.has(id);

  return (
    <li
      className={className}
      data-done={checked ? "" : undefined}
      onClick={
        on
          ? (e) => {
              // The checkbox handles its own clicks; a tap anywhere else on the row toggles it.
              if (!(e.target as Element).closest("input, a, button")) toggleDone(id);
            }
          : undefined
      }
    >
      <span className={markerClassName}>
        {on && (
          <input
            type="checkbox"
            className="cook-box"
            checked={checked}
            onChange={() => toggleDone(id)}
            aria-label={label}
          />
        )}
        {marker}
      </span>
      {children}
    </li>
  );
}
