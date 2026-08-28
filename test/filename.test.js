import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHtmlFilename, filenameFromContentDisposition } from '../src/lib/filename.js';

test('isHtmlFilename accepts .html and .htm, case-insensitively', () => {
  assert.equal(isHtmlFilename('report.html'), true);
  assert.equal(isHtmlFilename('report.htm'), true);
  assert.equal(isHtmlFilename('REPORT.HTML'), true);
  assert.equal(isHtmlFilename('a.b.c.Htm'), true);
});

test('isHtmlFilename rejects everything else', () => {
  assert.equal(isHtmlFilename('report.pdf'), false);
  assert.equal(isHtmlFilename('report.html.pdf'), false);
  assert.equal(isHtmlFilename('htm'), false);
  assert.equal(isHtmlFilename('.html'), false);
  assert.equal(isHtmlFilename(''), false);
  assert.equal(isHtmlFilename(null), false);
  assert.equal(isHtmlFilename(undefined), false);
});

test('isHtmlFilename ignores a Drive page-title suffix', () => {
  assert.equal(isHtmlFilename('report.html - Google Drive'), true);
  assert.equal(isHtmlFilename('Google Drive'), false);
  assert.equal(isHtmlFilename('report.pdf - Google Drive'), false);
});

test('filenameFromContentDisposition reads a quoted filename', () => {
  assert.equal(
    filenameFromContentDisposition('attachment; filename="my page.html"'),
    'my page.html'
  );
});

test('filenameFromContentDisposition reads an unquoted filename', () => {
  assert.equal(
    filenameFromContentDisposition('attachment; filename=page.html'),
    'page.html'
  );
});

test('filenameFromContentDisposition prefers RFC 5987 filename*', () => {
  assert.equal(
    filenameFromContentDisposition(
      "attachment; filename=\"fallback.bin\"; filename*=UTF-8''caf%C3%A9.html"
    ),
    'café.html'
  );
});

test('filenameFromContentDisposition returns null when absent', () => {
  assert.equal(filenameFromContentDisposition('attachment'), null);
  assert.equal(filenameFromContentDisposition(''), null);
  assert.equal(filenameFromContentDisposition(null), null);
});
