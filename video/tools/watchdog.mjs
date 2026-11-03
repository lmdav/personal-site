// Stops a long job that has gone quiet. A render without the ANGLE GL backend once sat
// idle for 10 minutes before anyone noticed (docs/recipe-playbook.md); this calls onStall
// once if the job reports no new progress for limitMs. The clock and timer are
// injectable for tests.
export function watchProgress({ limitMs, onStall, every = 5000, now = Date.now, timers = globalThis }) {
  let last;
  let lastAt = now();
  let stalled = false;
  const timer = timers.setInterval(() => {
    if (!stalled && now() - lastAt >= limitMs) {
      stalled = true;
      onStall(now() - lastAt);
    }
  }, every);
  return {
    /** Report progress; anything that differs from the last report counts. */
    progress(key) {
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
