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

  // The sandbox announces itself once loaded; only then can it receive the source.
  window.addEventListener('message', (event) => {
    if (event.source === elements.frame.contentWindow && event.data?.type === 'SANDBOX_READY') {
      elements.frame.contentWindow.postMessage({ type: 'RENDER', source }, '*');
    }
  });

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
    const response = await chrome.runtime.sendMessage({ type: 'REFETCH', fileId });
    if (response?.viewerUrl) {
      location.replace(response.viewerUrl);
    } else {
      fail(response?.error ?? 'Could not reload the file.');
    }
  });
}
