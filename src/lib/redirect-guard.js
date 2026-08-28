// Returning to the folder leaves the url exactly as it was when the redirect
// fired, because Drive's SPA never changed it. If Drive restores the overlay on
// that navigation the extension would redirect again at once and the user would
// be trapped with no way back. This guard breaks that loop.
//
// It deliberately does not use the nopreview flag: that would suppress every
// later file opened from the same folder page, since the url never changes.

const DEFAULT_WINDOW_MS = 5000;

/**
 * Allows one redirect per file id per window. In-memory on purpose: a service
 * worker restart forgets it, which is fine — a loop happens within seconds.
 */
export function createRedirectGuard({ now = () => Date.now(), windowMs = DEFAULT_WINDOW_MS } = {}) {
  const allowedAt = new Map();

  return {
    shouldRedirect(fileId) {
      const at = now();
      const previous = allowedAt.get(fileId);
      // A refused call does not extend the cooldown: only allowed ones count.
      if (previous !== undefined && at - previous < windowMs) return false;
      allowedAt.set(fileId, at);
      return true;
    }
  };
}
