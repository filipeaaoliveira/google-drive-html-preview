// MV3 content scripts cannot be ES modules, so this file stays deliberately
// dumb: it reports the page title as it changes and lets the service worker
// decide everything. Drive sets <title> to "<filename> - Google Drive" early
// in page load, which is the cheapest reliable signal that a file is HTML.

(() => {
  const GIVE_UP_AFTER_MS = 10000;

  let settled = false;
  let lastReported = null;

  async function report() {
    if (settled) return;

    const title = document.title;
    if (title === lastReported) return;
    lastReported = title;

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'PREVIEW_REQUEST',
        href: location.href,
        title
      });
    } catch {
      // The service worker may be restarting; a later title change retries.
      return;
    }

    if (settled || !response?.redirectTo) return;
    settled = true;
    location.replace(response.redirectTo);
  }

  function watchTitle() {
    const head = document.head;
    if (!head) return;

    new MutationObserver(report).observe(head, {
      subtree: true,
      childList: true,
      characterData: true
    });
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

  setTimeout(() => {
    settled = true;
  }, GIVE_UP_AFTER_MS);
})();
