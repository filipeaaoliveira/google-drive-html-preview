const KEY_PREFIX = 'src:';

// chrome.storage.session holds 10 MB for the whole extension, and a payload is
// the full source of the file. A payload that no viewer takes stays until the
// browser restarts, and enough of them fill the quota. After that, every file
// too large for the space left fails to preview. A viewer takes its payload as
// soon as it loads, so a payload older than this will never be taken.
const DEFAULT_MAX_AGE_MS = 60000;

/**
 * A single-use handoff store. The service worker puts the fetched source in;
 * the viewer takes it exactly once. Keys are consumed on read so a viewer URL
 * cannot be replayed, shared, or left behind in history as a live handle.
 *
 * Each key carries the time it was written, so put() can remove payloads that
 * outlived any viewer without reading their contents.
 */
export function createSourceStore(
  area,
  { makeId = () => crypto.randomUUID(), now = () => Date.now(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}
) {
  async function storedKeys() {
    // getKeys() arrived in Chrome 130. get(null) reads every value, so it is
    // only the fallback for older browsers.
    if (typeof area.getKeys === 'function') return area.getKeys();
    return Object.keys(await area.get(null));
  }

  function isStale(key, at) {
    if (!key.startsWith(KEY_PREFIX)) return false; // not ours to remove
    const writtenAt = Number(key.slice(KEY_PREFIX.length).split(':')[0]);
    // A key without a readable time was written by an earlier version.
    return !Number.isFinite(writtenAt) || at - writtenAt >= maxAgeMs;
  }

  async function removeStale(at) {
    const stale = (await storedKeys()).filter((key) => isStale(key, at));
    if (stale.length > 0) await area.remove(stale);
  }

  return {
    async put(payload) {
      const at = now();
      try {
        await removeStale(at);
      } catch {
        // Removing old payloads makes room. A failure to remove them is no
        // reason to refuse a new payload that may still fit.
      }
      const key = `${KEY_PREFIX}${at}:${makeId()}`;
      await area.set({ [key]: payload });
      return key;
    },

    async take(key) {
      if (typeof key !== 'string' || !key.startsWith(KEY_PREFIX)) return null;
      const found = await area.get(key);
      const payload = found[key];
      if (payload === undefined) return null;
      await area.remove(key);
      return payload;
    }
  };
}
