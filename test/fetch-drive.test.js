import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDriveFile, downloadUrl, DriveFetchError } from '../src/lib/fetch-drive.js';

function fakeResponse({
  status = 200,
  headers = {},
  body = '',
  url = 'https://drive.usercontent.google.com/download'
} = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => body
  };
}

test('downloadUrl targets the usercontent endpoint and encodes the id', () => {
  assert.equal(
    downloadUrl('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123'),
    'https://drive.usercontent.google.com/download?id=1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123&export=download'
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
  await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl);
  assert.equal(seen.options.credentials, 'include');
  assert.equal(seen.url, downloadUrl('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123'));
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
  const result = await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl);
  assert.deepEqual(result, {
    fileId: '1AbCdEf_gH-ijkLMNopQRstUVwxyz0123',
    name: 'report.html',
    contentType: 'text/html',
    source: '<h1>report</h1>',
    isHtml: true,
    isSignInPage: false
  });
});

test('fetchDriveFile falls back to Content-Type when the filename is absent', async () => {
  const fetchImpl = async () =>
    fakeResponse({ headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<p>x</p>' });
  const result = await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl);
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
  assert.equal((await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl)).isHtml, false);
});

test('fetchDriveFile throws DriveFetchError carrying the status', async () => {
  const fetchImpl = async () => fakeResponse({ status: 403, body: 'denied' });
  await assert.rejects(
    () => fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl),
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

test('fetchDriveFile trusts the filename over a disagreeing Content-Type', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      headers: {
        'content-disposition': 'attachment; filename="report.html"',
        'content-type': 'application/octet-stream'
      },
      body: '<h1>report</h1>'
    });
  assert.equal((await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl)).isHtml, true);
});

test('fetchDriveFile flags a redirect to the sign-in page', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: '<form action="/signin">',
      url: 'https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fdrive.google.com%2F'
    });
  const result = await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl);
  assert.equal(result.isSignInPage, true);
  assert.equal(result.isHtml, false);
});

test('fetchDriveFile does not flag a response served from the download host', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      headers: {
        'content-disposition': 'attachment; filename="report.html"',
        'content-type': 'text/html'
      },
      body: '<h1>report</h1>',
      url: 'https://drive.usercontent.google.com/download?id=1AbCdEf_gH-ijkLMNopQRstUVwxyz0123&export=download'
    });
  const result = await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', fetchImpl);
  assert.equal(result.isSignInPage, false);
  assert.equal(result.isHtml, true);
});

test('fetchDriveFile treats a missing or unparseable url as not a sign-in page', async () => {
  const missing = async () =>
    fakeResponse({
      headers: { 'content-type': 'text/html' },
      body: '<p>x</p>',
      url: null
    });
  assert.equal((await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', missing)).isSignInPage, false);

  const unparseable = async () =>
    fakeResponse({
      headers: { 'content-type': 'text/html' },
      body: '<p>x</p>',
      url: 'not a url'
    });
  const result = await fetchDriveFile('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', unparseable);
  assert.equal(result.isSignInPage, false);
  assert.equal(result.isHtml, true);
});
