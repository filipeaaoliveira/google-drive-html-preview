/**
 * Runs one task per key at a time. A caller that asks for a key while its task
 * is still running gets that task's promise rather than starting a second run.
 * The key is released when the task settles, so a later call starts afresh.
 *
 * The service worker needs this because Drive's overlay reports the same file
 * on every DOM mutation burst. Without it, each report that arrives during a
 * download starts another download and stores another full copy of the file.
 */
export function createInFlight() {
  const running = new Map();

  return {
    run(key, task) {
      const existing = running.get(key);
      if (existing) return existing;

      const promise = Promise.resolve()
        .then(task)
        .finally(() => running.delete(key));
      running.set(key, promise);
      return promise;
    },

    get size() {
      return running.size;
    }
  };
}
