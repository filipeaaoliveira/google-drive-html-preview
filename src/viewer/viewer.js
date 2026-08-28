import { createSourceStore } from '../lib/source-store.js';
import { driveViewUrl } from '../lib/drive-url.js';

const store = createSourceStore(chrome.storage.session);

const elements = {
  filename: document.getElementById('filename'),
  frame: document.getElementById('frame'),
  source: document.getElementById('source'),
  error: document.getElementById('error'),
  toggleSource: document.getElementById('toggle-source'),
  reload: document.getElementById('reload'),
  back: document.getElementById('back')
};

function fail(message) {
  elements.filename.textContent = 'Drive HTML Preview';
  elements.frame.hidden = true;
  elements.source.hidden = true;
  elements.error.hidden = false;
  elements.error.textContent = message;
  // Once an error is showing there is nothing to toggle or reload; "Back to
  // Drive" stays enabled because it is the escape hatch.
  elements.toggleSource.disabled = true;
  elements.reload.disabled = true;
}

const key = new URLSearchParams(location.search).get('k');
const payload = key ? await store.take(key) : null;

if (!payload) {
  // Keys are single-use, so this is the expected state on a page reload.
  fail('This preview has already been opened. Reopen the file from Google Drive.');
} else {
  start(payload);
}

function start({ fileId, name, source }) {
  const label = name || 'Untitled.html';
  elements.filename.textContent = label;
  document.title = `${label} — Drive HTML Preview`;

  // Attach the load listener BEFORE assigning src, so the event cannot be missed.
  // This is what removes the startup race: ordering stops mattering entirely.
  elements.frame.addEventListener(
    'load',
    () => {
      elements.frame.contentWindow.postMessage({ type: 'RENDER', source }, '*');
    },
    { once: true }
  );
  elements.frame.src = '../sandbox/sandbox.html';

  elements.source.textContent = source;

  elements.toggleSource.addEventListener('click', () => {
    const showingSource = !elements.source.hidden;
    elements.source.hidden = showingSource;
    elements.frame.hidden = !showingSource;
    elements.toggleSource.textContent = showingSource ? 'View source' : 'View rendered';
  });

  elements.back.addEventListener('click', () => {
    location.replace(driveViewUrl(fileId, { noPreview: true }));
  });

  elements.reload.addEventListener('click', async () => {
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'REFETCH', fileId });
    } catch (cause) {
      fail(`Could not reach the extension to reload the file: ${cause?.message ?? cause}`);
      return;
    }
    if (response?.viewerUrl) {
      location.replace(response.viewerUrl);
    } else {
      fail(response?.error ?? 'Could not reload the file.');
    }
  });
}
