// This page runs in an opaque origin declared by the manifest's "sandbox" key.
// It has no access to chrome.* APIs, extension storage, or the user's cookies.
// Everything it renders is untrusted by construction.

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  if (event.data?.type !== 'RENDER') return;

  document.open();
  document.write(event.data.source);
  document.close();
});

window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
