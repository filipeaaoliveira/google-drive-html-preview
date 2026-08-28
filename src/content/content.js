// MV3 content scripts cannot be ES modules, so this file holds no logic: it
// reports the page title as it changes and lets the service worker decide
// everything. Drive sets <title> to "<filename> - Google Drive" early
// in page load, which is the cheapest reliable signal that a file is HTML.
//
// Drive is a single-page app: opening a file from a folder is a pushState
// navigation, not a document load, so Chrome never re-injects this script.
// All state is therefore per-URL, not per-document, and the observer stays
// connected for the life of the page.

(() => {
  const GIVE_UP_AFTER_MS = 10000;
  const OVERLAY_DEBOUNCE_MS = 200;
  const DRIVE_FILE_ID = /^[A-Za-z0-9_-]{10,}$/;
  const HTML_NAME = /.\.html?$/i;

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

  // Duplicated from cleanDisplayName() in the shared target helper: a classic
  // content script cannot load modules, so this small normalisation is repeated
  // here. Keep the two in step.
  function cleanLabel(raw) {
    if (typeof raw !== 'string') return '';
    const collapsed = raw.trim().replace(/\s+/g, ' ');
    return collapsed.endsWith('.') ? collapsed.slice(0, -1).trim() : collapsed;
  }

  // Drive wraps the name in prose: "Displaying report.html.", "HTML, report.html.".
  // Filenames may themselves contain spaces and commas, so rather than guessing
  // where the name starts, every suffix that begins at a word or comma boundary
  // and ends in .html/.htm is offered as a candidate, longest first. Only a
  // candidate the selected row's own label confirms is used.
  function nameCandidates(raw) {
    const cleaned = cleanLabel(raw);
    const candidates = [];
    for (let i = 0; i < cleaned.length; i += 1) {
      const boundary = i === 0 || cleaned[i - 1] === ' ' || cleaned[i - 1] === ',';
      if (!boundary) continue;
      const tail = cleanLabel(cleaned.slice(i));
      if (HTML_NAME.test(tail)) candidates.push(tail);
    }
    return candidates;
  }

  // Duplicated from labelContainsName() in the shared target helper, for the
  // same reason as cleanLabel above: keep the two in step. A plain substring
  // test would accept "myreport.html" for "report.html", a different file, so
  // the name must sit at a start/end, space or comma boundary.
  function labelNamesFile(label, name) {
    const haystack = cleanLabel(label);
    const needle = cleanLabel(name);
    if (haystack === '' || needle === '') return false;

    let from = 0;
    for (;;) {
      const at = haystack.indexOf(needle, from);
      if (at === -1) return false;
      const before = at === 0 ? ' ' : haystack[at - 1];
      const afterIndex = at + needle.length;
      const after = afterIndex === haystack.length ? ' ' : haystack[afterIndex];
      if ((before === ' ' || before === ',') && (after === ' ' || after === ',')) return true;
      from = at + 1;
    }
  }

  // Every aria-label carried by an element or anything beneath it. Drive splits
  // the two halves of a row's identity across a subtree: the data-id sits on the
  // row, while the filename label sits on a descendant of it.
  function labelsWithin(el) {
    const labels = [el.getAttribute('aria-label')];
    for (const child of el.querySelectorAll('[aria-label]')) {
      labels.push(child.getAttribute('aria-label'));
    }
    return labels;
  }

  // Drive leaves the previous preview's dialog in the DOM as aria-hidden.
  // Taking the first [role="dialog"] would target a file the user closed.
  function visibleDialog(doc) {
    const dialogs = doc.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      if (dialog.getAttribute('aria-hidden') !== 'true') return dialog;
    }
    return null;
  }

  // Two independent DOM paths must agree on the same file: the name shown in
  // the visible dialog, and the aria-label of the single selected row that
  // carries the id. Anything ambiguous returns null, which leaves Drive alone.
  function readOverlayTarget(doc) {
    const dialog = visibleDialog(doc);
    if (!dialog) return null; // the common case: bail out before touching the big DOM

    const labels = labelsWithin(dialog);
    if (!labels.some((label) => nameCandidates(label).length > 0)) return null;

    const selected = doc.querySelectorAll('[aria-selected="true"][data-id]');
    if (selected.length !== 1) return null;

    const row = selected[0];
    const fileId = row.getAttribute('data-id');
    if (!DRIVE_FILE_ID.test(fileId || '')) return null;

    const rowLabels = labelsWithin(row);
    for (const label of labels) {
      for (const name of nameCandidates(label)) {
        if (rowLabels.some((rowLabel) => labelNamesFile(rowLabel, name))) return { fileId, name };
      }
    }
    return null;
  }

  // Content scripts run in an isolated world, so this global is invisible to
  // Drive's own page. It exists so the reader above can be unit-tested.
  globalThis.__driveHtmlPreviewReadOverlayTarget = readOverlayTarget;

  // Whether a file is worth attempting again is a decision, so it lives in the
  // service worker with the rest of them, in src/lib/attempt-log.js. Keeping it
  // there keeps it testable: an earlier version tracked attempts here
  // and marked a file as tried before knowing the answer, which left a file
  // unopenable for the life of the page after any transient decline, such as
  // the popup toggle being off.
  async function reportOverlay() {
    if (redirected) return;

    const target = readOverlayTarget(document);
    if (!target) return;

    const href = location.href;
    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'PREVIEW_REQUEST',
        href,
        title: document.title,
        fileId: target.fileId,
        expectedName: target.name
      });
    } catch {
      // The service worker was unreachable. This id is already marked as
      // attempted, so nothing retries it; Drive's own page keeps working.
      return;
    }

    if (redirected || href !== location.href) return;
    if (!response?.redirectTo) return;

    redirected = true;
    location.replace(response.redirectTo);
  }

  function watchOverlay() {
    let timer = null;

    // Drive's folder page is large — 95 [data-id] elements were observed — and
    // these attributes change constantly, so the work is debounced and
    // readOverlayTarget exits on its first selector when no overlay is open.
    new MutationObserver(() => {
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        reportOverlay();
      }, OVERLAY_DEBOUNCE_MS);
    }).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-hidden', 'aria-selected', 'aria-label']
    });

    reportOverlay();
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
    window.addEventListener('popstate', reportOverlay);

    report();
  }

  // <body> may not exist yet at document_start either.
  function whenBodyReady() {
    if (document.body) {
      watchOverlay();
      return;
    }
    new MutationObserver((_records, observer) => {
      if (!document.body) return;
      observer.disconnect();
      watchOverlay();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  whenBodyReady();

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
