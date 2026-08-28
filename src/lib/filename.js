const TITLE_SUFFIX = ' - Google Drive';
const HTML_EXTENSION = /.\.html?$/i;

/**
 * True when `name` ends in .html or .htm. Tolerates Drive's page-title
 * suffix so the content script can pass document.title through unchanged.
 * A bare ".html" with no stem is rejected — that is a dotfile, not a page.
 */
export function isHtmlFilename(name) {
  if (typeof name !== 'string') return false;
  const trimmed = name.endsWith(TITLE_SUFFIX)
    ? name.slice(0, -TITLE_SUFFIX.length)
    : name;
  return HTML_EXTENSION.test(trimmed.trim());
}

/**
 * Extracts the filename from a Content-Disposition header.
 * RFC 5987 `filename*` wins over plain `filename` when both are present.
 */
export function filenameFromContentDisposition(header) {
  if (typeof header !== 'string' || header === '') return null;

  const extended = /;\s*filename\*\s*=\s*([^']*)'([^']*)'([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[3].trim());
    } catch {
      // Malformed percent-encoding: fall through to the plain form.
    }
  }

  const quoted = /;\s*filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quoted) return quoted[1];

  const plain = /;\s*filename\s*=\s*([^;]+)/i.exec(header);
  if (plain) return plain[1].trim();

  return null;
}
