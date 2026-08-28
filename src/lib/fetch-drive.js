import { filenameFromContentDisposition, isHtmlFilename } from './filename.js';

export const DOWNLOAD_ENDPOINT = 'https://drive.usercontent.google.com/download';

const FILE_ID = /^[A-Za-z0-9_-]+$/;

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
  if (typeof fileId !== 'string' || !FILE_ID.test(fileId)) {
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

  const isHtml = name
    ? isHtmlFilename(name)
    : contentType.split(';')[0].trim().toLowerCase() === 'text/html';

  return { fileId, name, contentType, source, isHtml };
}
