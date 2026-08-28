import { shouldConsiderPreview, shouldConsiderOverlayPreview } from '../lib/decide.js';
import { namesMatch } from '../lib/target.js';
import { fetchDriveFile, DriveFetchError } from '../lib/fetch-drive.js';
import { createSourceStore } from '../lib/source-store.js';
import { createSettings } from '../lib/settings.js';
import { viewerPath } from '../lib/messages.js';

const SIGNED_OUT_MESSAGE =
  'You appear to be signed out of Google. Sign in to Drive and try again.';

const NOT_HTML_MESSAGE =
  'This file is no longer an HTML file, so there is nothing to preview. Open it from Google Drive instead.';

const store = createSourceStore(chrome.storage.session);
const settings = createSettings(chrome.storage.local);

async function stash(file) {
  const key = await store.put({
    fileId: file.fileId,
    name: file.name,
    source: file.source
  });
  return chrome.runtime.getURL(viewerPath(key));
}

async function handlePreviewRequest({ href, title, fileId, expectedName }) {
  const enabled = await settings.isEnabled();
  // A fileId means the content script found the file in Drive's in-folder
  // overlay, where the url and title say nothing about it. Without one, this
  // is the original /file/d/<id>/view path, decided exactly as before.
  const decision = fileId
    ? shouldConsiderOverlayPreview({ fileId, name: expectedName, enabled })
    : shouldConsiderPreview({ href, title, enabled });
  if (!decision.consider) return { redirectTo: null };

  try {
    const file = await fetchDriveFile(decision.fileId);
    // Google answers a signed-out request with its sign-in page as HTTP 200
    // text/html. Rendering that as the user's document would be worse than
    // leaving Drive's own page alone.
    if (file.isSignInPage) return { redirectTo: null };
    if (!file.isHtml) return { redirectTo: null };
    // The backstop for the overlay's DOM guesswork: what Drive sent back must
    // be the file the content script said it was. An empty name — no
    // Content-Disposition — is a mismatch: an identity that cannot be checked
    // must not be rendered.
    if (expectedName && !namesMatch(expectedName, file.name)) {
      console.warn(
        `Drive HTML Preview: name mismatch, expected "${expectedName}" but Drive sent "${file.name}"`
      );
      return { redirectTo: null };
    }
    return { redirectTo: await stash(file) };
  } catch (error) {
    // A failed fetch must leave Drive's own page working. Never redirect on error.
    console.warn('Drive HTML Preview: fetch failed', error);
    return { redirectTo: null };
  }
}

async function handleRefetch({ fileId }) {
  try {
    const file = await fetchDriveFile(fileId);
    // This path is user-triggered, so an invisible no-op would look like a bug.
    if (file.isSignInPage) return { error: SIGNED_OUT_MESSAGE };
    // The file may have been replaced in Drive since the preview was opened.
    // Writing a PDF's bytes into the sandbox would produce a garbage page.
    if (!file.isHtml) return { error: NOT_HTML_MESSAGE };
    return { viewerUrl: await stash(file) };
  } catch (error) {
    const detail = error instanceof DriveFetchError ? `HTTP ${error.status}` : String(error);
    return { error: `Could not reload the file (${detail}).` };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler =
    message?.type === 'PREVIEW_REQUEST'
      ? handlePreviewRequest
      : message?.type === 'REFETCH'
        ? handleRefetch
        : null;

  if (!handler) return false;

  // Anything that rejects before the handler's own try block — reading the
  // enabled flag out of chrome.storage.local, say — would otherwise leave
  // sendResponse uncalled and the caller's port hanging open.
  const fallback =
    message.type === 'PREVIEW_REQUEST'
      ? { redirectTo: null } // never redirect on error: Drive's own page must keep working
      : { error: 'Could not reload the file.' };

  handler(message)
    .then(sendResponse)
    .catch((error) => {
      try {
        console.warn('Drive HTML Preview: handler failed', error);
        sendResponse(fallback);
      } catch {
        // The port is already closed, so there is nobody left to answer.
      }
    });
  return true; // keep the message channel open for the async response
});
