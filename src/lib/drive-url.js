import { isDriveFileId } from './target.js';

const DRIVE_HOST = 'drive.google.com';
const FILE_PATH = /^\/file\/d\/([A-Za-z0-9_-]+)\//;
export const NO_PREVIEW_PARAM = 'nopreview';

function parse(href) {
  if (typeof href !== 'string') return null;
  try {
    return new URL(href);
  } catch {
    return null;
  }
}

/** Returns the Drive file id from a drive.google.com file URL, else null. */
export function parseDriveFileId(href) {
  const url = parse(href);
  if (!url || url.hostname !== DRIVE_HOST) return null;
  const match = FILE_PATH.exec(url.pathname);
  // The path pattern is loose so it matches whatever Drive puts there; the one
  // shared validator decides whether it is really a file id.
  return match && isDriveFileId(match[1]) ? match[1] : null;
}

/** True when the URL carries the escape-hatch parameter that suppresses preview. */
export function hasNoPreviewFlag(href) {
  const url = parse(href);
  return url ? url.searchParams.get(NO_PREVIEW_PARAM) === '1' : false;
}

/** Builds a canonical Drive file view URL. */
export function driveViewUrl(fileId, { noPreview = false } = {}) {
  if (!isDriveFileId(fileId)) {
    throw new Error(`invalid drive file id: ${fileId}`);
  }
  const base = `https://${DRIVE_HOST}/file/d/${fileId}/view`;
  return noPreview ? `${base}?${NO_PREVIEW_PARAM}=1` : base;
}
