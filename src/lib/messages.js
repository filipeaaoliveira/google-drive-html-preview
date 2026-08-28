export const VIEWER_PAGE = 'src/viewer/viewer.html';

/** Builds the extension-relative viewer path carrying a single-use store key. */
export function viewerPath(key) {
  if (typeof key !== 'string' || key === '') {
    throw new Error('key is required');
  }
  return `${VIEWER_PAGE}?k=${encodeURIComponent(key)}`;
}
