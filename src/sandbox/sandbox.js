// This page runs in an opaque origin declared by the manifest's "sandbox" key.
// It has no access to chrome.* APIs, extension storage, or the user's cookies.
// Everything it renders is untrusted by construction.
//
// The viewer attaches a load listener to the frame before assigning its src, so
// it posts RENDER as soon as this document exists. There is nothing to announce.

window.addEventListener('message', (event) => {
  if (event.source !== window.parent) return;
  if (event.data?.type !== 'RENDER') return;

  document.open();
  document.write(event.data.source);
  document.close();
});
