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

const OVERLAY = {
  type: 'PREVIEW_REQUEST',
  href: 'https://drive.google.com/drive/home',
  title: 'Home - Google Drive',
  fileId: ID,
  expectedName: 'report.html'
};

test('an overlay request redirects when the fetched filename matches', async () => {
  nextResponse = reply({ name: 'report.html' });
  const response = await send(OVERLAY);
  assert.match(response.redirectTo, /^chrome-extension:\/\/test\/src\/viewer\/viewer\.html\?k=/);
});

test('an overlay request declines when the fetched filename is a different file', async () => {
  nextResponse = reply({ name: 'other.html' });
  assert.deepEqual(await send(OVERLAY), { redirectTo: null });
});

test('an overlay request declines when the response carries no filename', async () => {
  nextResponse = reply({ name: null });
  assert.deepEqual(await send(OVERLAY), { redirectTo: null });
});

test('an overlay request declines when Drive answers with a different, non-HTML file', async () => {
  nextResponse = reply({ name: 'clip.mov', contentType: 'video/quicktime' });
  assert.deepEqual(await send(OVERLAY), { redirectTo: null });
});

test('an overlay request declines a sign-in page even when the name matches', async () => {
  nextResponse = reply({ name: 'report.html', url: 'https://accounts.google.com/signin' });
  assert.deepEqual(await send(OVERLAY), { redirectTo: null });
});

test('an overlay request declines a file id that is not a Drive id, without fetching', async () => {
  nextResponse = reply({ name: 'report.html' });
  const before = fetched.length;
  assert.deepEqual(await send({ ...OVERLAY, fileId: '../x' }), { redirectTo: null });
  assert.equal(fetched.length, before, 'a bad id must never reach the network');
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
