import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDriveFile, downloadUrl, DriveFetchError } from '../src/lib/fetch-drive.js';

function fakeResponse({ status = 200, headers = {}, body = '' } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: 'https://drive.usercontent.google.com/download',
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => body
  };
}

test('downloadUrl targets the usercontent endpoint and encodes the id', () => {
  assert.equal(
    downloadUrl('1AbC-_dEf'),
    'https://drive.usercontent.google.com/download?id=1AbC-_dEf&export=download'
  );
});

test('fetchDriveFile sends credentials', async () => {
  let seen;
  const fetchImpl = async (url, options) => {
    seen = { url, options };
    return fakeResponse({
      headers: { 'content-disposition': 'attachment; filename="p.html"' },
      body: '<h1>ok</h1>'
    });
  };
  await fetchDriveFile('1AbC', fetchImpl);
  assert.equal(seen.options.credentials, 'include');
  assert.equal(seen.url, downloadUrl('1AbC'));
});

test('fetchDriveFile returns the name, source, and an isHtml verdict', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      headers: {
        'content-disposition': 'attachment; filename="report.html"',
        'content-type': 'text/html'
      },
      body: '<h1>report</h1>'
    });
  const result = await fetchDriveFile('1AbC', fetchImpl);
  assert.deepEqual(result, {
    fileId: '1AbC',
    name: 'report.html',
    contentType: 'text/html',
    source: '<h1>report</h1>',
    isHtml: true
  });
});

test('fetchDriveFile falls back to Content-Type when the filename is absent', async () => {
  const fetchImpl = async () =>
    fakeResponse({ headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<p>x</p>' });
  const result = await fetchDriveFile('1AbC', fetchImpl);
  assert.equal(result.name, '');
  assert.equal(result.isHtml, true);
});

test('fetchDriveFile reports non-HTML files as such', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      headers: {
        'content-disposition': 'attachment; filename="doc.pdf"',
        'content-type': 'application/pdf'
      },
      body: '%PDF-1.4'
    });
  assert.equal((await fetchDriveFile('1AbC', fetchImpl)).isHtml, false);
});

test('fetchDriveFile throws DriveFetchError carrying the status', async () => {
  const fetchImpl = async () => fakeResponse({ status: 403, body: 'denied' });
  await assert.rejects(
    () => fetchDriveFile('1AbC', fetchImpl),
    (error) => error instanceof DriveFetchError && error.status === 403
  );
});

test('fetchDriveFile rejects a malformed file id before hitting the network', async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return fakeResponse();
  };
  await assert.rejects(() => fetchDriveFile('../evil', fetchImpl), /invalid drive file id/i);
  assert.equal(called, false);
});
