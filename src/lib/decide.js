import { parseDriveFileId, hasNoPreviewFlag } from './drive-url.js';
import { isHtmlFilename } from './filename.js';
import { isDriveFileId } from './target.js';

function no(reason) {
  return { consider: false, fileId: null, reason };
}

/**
 * Decides whether a Drive page is worth downloading to preview.
 *
 * The title check is the gate because it costs nothing, whereas
 * downloading every file the user opens in Drive — PDFs, videos — purely
 * to sniff its type would be far worse. The service worker re-confirms
 * from the response headers after fetching.
 */
export function shouldConsiderPreview({ href, title, enabled }) {
  if (!enabled) return no('disabled');
  if (hasNoPreviewFlag(href)) return no('nopreview-flag');

  const fileId = parseDriveFileId(href);
  if (!fileId) return no('not-a-drive-file');

  if (!isHtmlFilename(title)) return no('title-not-html');

  return { consider: true, fileId, reason: 'ok' };
}

/**
 * Decides whether a file opened in Drive's in-folder overlay is worth
 * downloading. The overlay leaves the url and title unchanged, so the id and
 * the name both come from the DOM; the service worker still re-confirms the
 * name against the response's Content-Disposition before rendering anything.
 */
export function shouldConsiderOverlayPreview({ fileId, name, enabled }) {
  if (!enabled) return no('disabled');
  if (!isDriveFileId(fileId)) return no('bad-file-id');
  if (!isHtmlFilename(name)) return no('name-not-html');

  return { consider: true, fileId, reason: 'ok' };
}
