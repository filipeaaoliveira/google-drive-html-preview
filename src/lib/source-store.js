const KEY_PREFIX = 'src:';

/**
 * A single-use handoff store. The service worker puts the fetched source in;
 * the viewer takes it exactly once. Keys are consumed on read so a viewer URL
 * cannot be replayed, shared, or left behind in history as a live handle.
 */
export function createSourceStore(area, makeId = () => crypto.randomUUID()) {
  return {
    async put(payload) {
      const key = KEY_PREFIX + makeId();
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
