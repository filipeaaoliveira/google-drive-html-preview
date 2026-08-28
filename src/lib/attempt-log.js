// One record of what the extension has already tried, per file id.
//
// Two problems share this state. Returning to the folder leaves the url exactly
// as it was when a redirect fired, because Drive's SPA never changed it, so a
// restored overlay would redirect again at once and trap the user. And while an
// overlay stays open the content script reports on every DOM mutation burst, so
// a file that was already judged unrenderable must not be downloaded again each
// time.
//
// It does not use the nopreview flag: that would suppress every
// later file opened from the same folder page, since the url never changes.

const DEFAULT_WINDOW_MS = 2000;
const MAX_ENTRIES = 100;

// Maps and Sets keep insertion order, so the oldest entry is always the first.
function capped(store) {
  if (store.size <= MAX_ENTRIES) return;
  store.delete(store.keys().next().value);
}

/**
 * Records attempts so a file is neither redirected twice in a moment nor
 * re-downloaded after a decision that cannot change.
 *
 * A decline is only recorded when it is durable: the file is not HTML, or its
 * identity did not match. Transient declines, such as the extension being
 * switched off or the fetch failing, are never recorded, so turning the
 * extension back on and clicking the same file works immediately.
 */
export function createAttemptLog({ now = () => Date.now(), windowMs = DEFAULT_WINDOW_MS } = {}) {
  const redirectedAt = new Map();
  const declined = new Set();

  return {
    shouldAttempt(fileId) {
      if (declined.has(fileId)) return false;
      const previous = redirectedAt.get(fileId);
      return previous === undefined || now() - previous >= windowMs;
    },

    recordRedirect(fileId) {
      redirectedAt.set(fileId, now());
      capped(redirectedAt);
    },

    recordDurableDecline(fileId) {
      declined.add(fileId);
      capped(declined);
    }
  };
}
