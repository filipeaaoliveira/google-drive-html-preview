const ENABLED_KEY = 'enabled';

/** The redirect is on unless the user has explicitly turned it off. */
export function createSettings(area) {
  return {
    async isEnabled() {
      const found = await area.get(ENABLED_KEY);
      return found[ENABLED_KEY] !== false;
    },

    async setEnabled(value) {
      await area.set({ [ENABLED_KEY]: Boolean(value) });
    }
  };
}
