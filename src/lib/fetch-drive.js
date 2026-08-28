import { filenameFromContentDisposition, isHtmlFilename } from './filename.js';
import { isDriveFileId } from './target.js';

export const DOWNLOAD_ENDPOINT = 'https://drive.usercontent.google.com/download';

const DOWNLOAD_HOSTS = new Set(['drive.usercontent.google.com', 'drive.google.com']);

/**
 * True when the response came back from somewhere other than Drive's download
 * hosts. A signed-out user — or one in the wrong Chrome profile — is redirected
 * to Google's sign-in page, which arrives as HTTP 200 text/html and would
 * otherwise be rendered as if it were the user's document.
 */
function leftDownloadHost(url) {
  if (typeof url !== 'string' || url === '') return false;
  try {
    return !DOWNLOAD_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export class DriveFetchError extends Error {
  constructor(status) {
    super(`Drive returned HTTP ${status}`);
    this.name = 'DriveFetchError';
    this.status = status;
  }
}

export function downloadUrl(fileId) {
  return `${DOWNLOAD_ENDPOINT}?id=${encodeURIComponent(fileId)}&export=download`;
}

/**
 * Fetches a Drive file's bytes using the user's existing Google session.
 * No OAuth: `credentials: 'include'` plus the manifest's host permissions
 * are what carry the user's cookies.
 */
export async function fetchDriveFile(fileId, fetchImpl = fetch) {
  if (!isDriveFileId(fileId)) {
    throw new Error(`invalid drive file id: ${fileId}`);
  }

  const response = await fetchImpl(downloadUrl(fileId), {
    credentials: 'include',
    redirect: 'follow'
  });

  if (!response.ok) throw new DriveFetchError(response.status);

  const name = filenameFromContentDisposition(response.headers.get('Content-Disposition')) ?? '';
  const contentType = response.headers.get('Content-Type') ?? '';
  const source = await response.text();

  const isSignInPage = leftDownloadHost(response.url);

  const isHtml =
    !isSignInPage &&
    (name
      ? isHtmlFilename(name)
      : contentType.split(';')[0].trim().toLowerCase() === 'text/html');

  return { fileId, name, contentType, source, isHtml, isSignInPage };
}
