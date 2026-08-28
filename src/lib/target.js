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
 * True when two names are the same file. Case-sensitive on purpose: Drive
 * preserves filename case, and `Report.html` and `report.html` can both exist
 * in one folder as different files. Empty names never match — an unverifiable
 * identity must not be treated as a confirmation.
 */
export function namesMatch(expected, actual) {
  const a = cleanDisplayName(expected);
  const b = cleanDisplayName(actual);
  return a !== '' && b !== '' && a === b;
}
