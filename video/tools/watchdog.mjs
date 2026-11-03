// Stops a long job that has gone quiet. A render without the ANGLE GL backend once sat
// idle for 10 minutes before anyone noticed (docs/recipe-playbook.md); this calls onStall
// once if the job reports no new progress for limitMs (a report can change the limit for
// what follows), or once it has run past maxMs in all. The clock and timer are injectable
// for tests.
/**
 * @param {{ limitMs: number, maxMs?: number, onStall: (ms: number, why: "quiet" | "deadline") => void, every?: number, now?: () => number,
 *   timers?: { setInterval: (fn: () => void, ms: number) => unknown, clearInterval: (id: any) => void } }} options
 */
export function watchProgress({ limitMs, maxMs = Infinity, onStall, every = 5000, now = Date.now, timers = globalThis }) {
  let last;
  let limit = limitMs;
  const startedAt = now();
  let lastAt = startedAt;
  let stalled = false;
  const timer = timers.setInterval(() => {
    if (stalled) return;
    if (now() - lastAt >= limit) {
      stalled = true;
      onStall(now() - lastAt, "quiet");
    } else if (now() - startedAt >= maxMs) {
      stalled = true;
      onStall(now() - startedAt, "deadline");
    }
  }, every);
  return {
    /** Report progress; anything that differs from the last report counts. newLimit sets
     * how long the job may go quiet from here on. */
    progress(key, newLimit = limit) {
      limit = newLimit;
      if (key !== last) {
        last = key;
        lastAt = now();
      }
    },
    stop: () => timers.clearInterval(timer),
    get stalled() {
      return stalled;
    },
  };
}
