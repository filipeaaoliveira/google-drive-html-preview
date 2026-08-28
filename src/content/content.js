// MV3 content scripts cannot be ES modules, so this file stays deliberately
// dumb: it reports the page title as it changes and lets the service worker
// decide everything. Drive sets <title> to "<filename> - Google Drive" early
// in page load, which is the cheapest reliable signal that a file is HTML.
//
// Drive is a single-page app: opening a file from a folder is a pushState
// navigation, not a document load, so Chrome never re-injects this script.
// All state is therefore per-URL, not per-document, and the observer stays
// connected for the life of the page.

(() => {
  const GIVE_UP_AFTER_MS = 10000;

  let currentUrl = null;
  let firstSeenAt = 0;
  let lastReported = null;
  let redirected = false;

  // Restarts the per-URL state whenever the SPA navigates.
  function syncUrl() {
    const href = location.href;
    if (href === currentUrl) return href;

    currentUrl = href;
    firstSeenAt = Date.now();
    lastReported = null;
    redirected = false;
    return href;
  }

  async function report() {
    const href = syncUrl();

    if (redirected) return;
    if (Date.now() - firstSeenAt > GIVE_UP_AFTER_MS) return;

    const title = document.title;
    if (title === lastReported) return;
    lastReported = title;

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'PREVIEW_REQUEST',
        href,
        title
      });
    } catch {
      // The service worker may be unreachable — restarting, or the extension
      // reloaded. The title has already been marked as reported, so nothing
      // retries it: this url gets no preview unless the title changes again,
      // which on a direct page load it will not. Drive's own page keeps
      // working, which is the property that matters.
      return;
    }

    // The SPA may have navigated away while the message was in flight.
    if (redirected || href !== location.href) return;
    if (!response?.redirectTo) return;

    redirected = true;
    location.replace(response.redirectTo);
  }

  function watchTitle() {
    const head = document.head;
    if (!head) return;

    // Never disconnected: Drive rewrites <title> on every SPA file switch.
    new MutationObserver(report).observe(head, {
      subtree: true,
      childList: true,
      characterData: true
    });

    // Back/forward within Drive changes the url but may leave the title alone.
    window.addEventListener('popstate', report);

    report();
  }

  // <head> does not exist yet at document_start.
  if (document.head) {
    watchTitle();
  } else {
    new MutationObserver((_records, observer) => {
      if (!document.head) return;
      observer.disconnect();
      watchTitle();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
