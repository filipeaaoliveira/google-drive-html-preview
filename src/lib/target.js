// Identity helpers for the overlay trigger. Drive's overlay leaves the url and
// the page title alone, so the file has to be identified from the DOM; these
// helpers keep that identification strict. Pure: no chrome global, no DOM.

const DRIVE_FILE_ID = /^[A-Za-z0-9_-]{10,}$/;

/** True when `value` has the shape of a Drive file id. */
export function isDriveFileId(value) {
  return typeof value === 'string' && DRIVE_FILE_ID.test(value);
}

/**
 * Normalises a filename read out of a Drive aria-label. Drive writes labels
 * like "HTML, report.html." — with a sentence-ending period — and pads them
 * with layout whitespace. Returns '' for anything that is not a string.
 */
export function cleanDisplayName(raw) {
  if (typeof raw !== 'string') return '';
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  return collapsed.endsWith('.') ? collapsed.slice(0, -1).trim() : collapsed;
}

/**
 * True when two names are the same file. Case-sensitive, because Drive
 * preserves filename case, and `Report.html` and `report.html` can both exist
 * in one folder as different files. Empty names never match — an unverifiable
 * identity must not be treated as a confirmation.
 */
export function namesMatch(expected, actual) {
  const a = cleanDisplayName(expected);
  const b = cleanDisplayName(actual);
  return a !== '' && b !== '' && a === b;
}

/**
 * True when `label` names exactly `name`. The name must sit at a word or comma
 * boundary: Drive labels a row "report.html HTML" and a dialog "HTML, report.html.",
 * but a plain substring test would also accept "myreport.html" for "report.html",
 * which is a different file.
 */
export function labelContainsName(label, name) {
  const haystack = cleanDisplayName(label);
  const needle = cleanDisplayName(name);
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

const DRIVE_ORIGIN = 'https://drive.google.com';

/**
 * Validates a url the viewer may navigate back to. A preview opened from
 * Drive's overlay has to return the user to the folder they came from, and
 * that url arrives in a message — so it is attacker-influenced input, not a
 * formality. Only the exact Drive origin is allowed: any other host, any
 * other scheme (javascript:, data:) and anything unparseable returns null.
 */
export function safeDriveReturnUrl(href) {
  if (typeof href !== 'string' || href === '') return null;
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  return url.origin === DRIVE_ORIGIN ? href : null;
}
