import { test } from 'node:test';
import assert from 'node:assert/strict';

// The service worker is a module with side effects: it registers a message
// listener and reads chrome.storage at import time. Stub the platform first,
// capture the listener, then drive it exactly as the content script would.

const session = new Map();
const local = new Map();

function area(map) {
  return {
    async get(key) {
      return map.has(key) ? { [key]: map.get(key) } : {};
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    }
  };
}

let listener = null;
let nextResponse = null;
const fetched = [];

globalThis.chrome = {
  storage: { session: area(session), local: area(local) },
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
    onMessage: {
      addListener(fn) {
        listener = fn;
      }
    }
  }
};

globalThis.fetch = async (url) => {
  fetched.push(url);
  return nextResponse();
};

function reply({ name, contentType = 'text/html', body = '<p>hi</p>', url }) {
  const headers = new Headers({ 'Content-Type': contentType });
  if (name) headers.set('Content-Disposition', `attachment; filename="${name}"`);
  return () => ({
    ok: true,
    status: 200,
    url: url ?? 'https://drive.usercontent.google.com/download?id=x',
    headers,
    text: async () => body
  });
}

await import('../src/background/service-worker.js');

function send(message) {
  return new Promise((resolve) => {
    const kept = listener(message, {}, resolve);
    assert.equal(kept, true, 'the listener must keep the channel open');
  });
}

const ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';

// Every case needs its own file id. The attempt log runs before the fetch, so a
// case reusing a previous case's id is declined by the log rather than by the
// check it means to exercise, and would pass with that check deleted.
let idCounter = 0;
function freshId() {
  return `9aa${String(idCounter++).padStart(2, '0')}bbCCddEEffGGhhIIjjKKllMM`;
}

function overlay(extra = {}) {
  return {
    type: 'PREVIEW_REQUEST',
    href: 'https://drive.google.com/drive/home',
    title: 'Home - Google Drive',
    fileId: freshId(),
    expectedName: 'report.html',
    ...extra
  };
}

test('an overlay request redirects when the fetched filename matches', async () => {
  nextResponse = reply({ name: 'report.html' });
  const response = await send(overlay());
  assert.match(response.redirectTo, /^chrome-extension:\/\/test\/src\/viewer\/viewer\.html\?k=/);
});

test('an overlay request declines when the fetched filename is a different file', async () => {
  nextResponse = reply({ name: 'other.html' });
  assert.deepEqual(await send(overlay()), { redirectTo: null });
});

test('an overlay request declines when the response carries no filename', async () => {
  nextResponse = reply({ name: null });
  assert.deepEqual(await send(overlay()), { redirectTo: null });
});

test('an overlay request declines when Drive answers with a different, non-HTML file', async () => {
  nextResponse = reply({ name: 'clip.mov', contentType: 'video/quicktime' });
  assert.deepEqual(await send(overlay()), { redirectTo: null });
});

test('an overlay request declines a sign-in page even when the name matches', async () => {
  nextResponse = reply({ name: 'report.html', url: 'https://accounts.google.com/signin' });
  assert.deepEqual(await send(overlay()), { redirectTo: null });
});

test('an overlay request declines a file id that is not a Drive id, without fetching', async () => {
  nextResponse = reply({ name: 'report.html' });
  const before = fetched.length;
  assert.deepEqual(await send(overlay({ fileId: '../x' })), { redirectTo: null });
  assert.equal(fetched.length, before, 'a bad id must never reach the network');
});

// The url-and-title path carries no expectedName, so the identity check cannot
// stand in for the content-type check here. This is the only case that isolates
// the isHtml guard in the service worker.
test('a url-and-title request declines when the fetched file is not HTML', async () => {
  nextResponse = reply({ name: 'notes.pdf', contentType: 'application/pdf' });
  const response = await send({
    type: 'PREVIEW_REQUEST',
    href: `https://drive.google.com/file/d/${freshId()}/view`,
    title: 'notes.html - Google Drive'
  });
  assert.deepEqual(response, { redirectTo: null });
});

test('a url-and-title request declines a sign-in page', async () => {
  nextResponse = reply({ name: 'page.html', url: 'https://accounts.google.com/signin' });
  const response = await send({
    type: 'PREVIEW_REQUEST',
    href: `https://drive.google.com/file/d/${freshId()}/view`,
    title: 'page.html - Google Drive'
  });
  assert.deepEqual(response, { redirectTo: null });
});

test('a request without a file id still takes the url-and-title path', async () => {
  nextResponse = reply({ name: 'page.html' });
  const response = await send({
    type: 'PREVIEW_REQUEST',
    href: `https://drive.google.com/file/d/${ID}/view`,
    title: 'page.html - Google Drive'
  });
  assert.match(response.redirectTo, /^chrome-extension:\/\/test\/src\/viewer\/viewer\.html\?k=/);
});

function lastStashed() {
  const payloads = [...session.values()];
  return payloads[payloads.length - 1];
}

const FOLDER = 'https://drive.google.com/drive/folders/0ABCdefGHIjklMNO';

test('an overlay request stashes the folder the user came from', async () => {
  nextResponse = reply({ name: 'report.html' });
  const response = await send(overlay({ href: FOLDER }));
  assert.ok(response.redirectTo);
  assert.equal(lastStashed().returnTo, FOLDER);
});

test('an overlay request stashes null when the reported href is not a Drive url', async () => {
  nextResponse = reply({ name: 'report.html' });
  const response = await send(overlay({ href: 'https://evil.example/drive/home' }));
  assert.ok(response.redirectTo);
  assert.equal(lastStashed().returnTo, null);
});

test('a url-and-title request stashes no return url', async () => {
  nextResponse = reply({ name: 'page.html' });
  const response = await send({
    type: 'PREVIEW_REQUEST',
    href: `https://drive.google.com/file/d/4wPvv7-aaBBccDDeeFFggHHiiJJkkLLmm/view`,
    title: 'page.html - Google Drive'
  });
  assert.ok(response.redirectTo);
  assert.equal(lastStashed().returnTo, null);
});

test('a durable decline is remembered, so the same file is not fetched again', async () => {
  const fileId = freshId();
  nextResponse = reply({ name: 'other.html' });
  assert.deepEqual(await send(overlay({ fileId })), { redirectTo: null });

  const before = fetched.length;
  nextResponse = reply({ name: 'report.html' });
  assert.deepEqual(await send(overlay({ fileId })), { redirectTo: null });
  assert.equal(fetched.length, before, 'a remembered decline must not download the file again');
});

test('a non-HTML file is remembered too, so it is not fetched again', async () => {
  const fileId = freshId();
  // The url-and-title path has no expectedName, so this exercises the isHtml
  // decline rather than the identity one.
  const request = {
    type: 'PREVIEW_REQUEST',
    href: 'https://drive.google.com/drive/home',
    title: 'Home - Google Drive',
    fileId,
    expectedName: 'notes.html'
  };
  nextResponse = reply({ name: 'notes.html', contentType: 'text/html', body: 'x' });

  // First make it decline for a non-HTML reason: Drive returns a PDF whose name
  // still matches, so isHtml is what refuses it.
  nextResponse = reply({ name: 'notes.pdf', contentType: 'application/pdf' });
  assert.deepEqual(await send(request), { redirectTo: null });

  const before = fetched.length;
  nextResponse = reply({ name: 'notes.html' });
  assert.deepEqual(await send(request), { redirectTo: null });
  assert.equal(fetched.length, before, 'a remembered non-HTML file must not be downloaded again');
});

// The regression that motivated moving this out of the content script: an
// earlier version marked a file as tried before knowing the answer, so a file
// opened while the extension was switched off stayed unopenable for the life of
// the page even after the user switched it back on.
test('a transient decline is not remembered, so the file works once re-enabled', async () => {
  const fileId = freshId();
  local.set('enabled', false);
  nextResponse = reply({ name: 'report.html' });
  assert.deepEqual(await send(overlay({ fileId })), { redirectTo: null });

  local.set('enabled', true);
  const response = await send(overlay({ fileId }));
  assert.ok(response.redirectTo, 'the same file must be previewable once re-enabled');
});

test('a repeat overlay redirect for the same file is refused within the guard window', async () => {
  const fileId = '5vOuu6-aaBBccDDeeFFggHHiiJJkkLLmm';
  nextResponse = reply({ name: 'report.html' });
  assert.ok((await send(overlay({ fileId, href: FOLDER }))).redirectTo);
  assert.deepEqual(await send(overlay({ fileId, href: FOLDER })), { redirectTo: null });
});
