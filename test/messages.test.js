import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewerPath, VIEWER_PAGE } from '../src/lib/messages.js';

test('viewerPath embeds the key as a query parameter', () => {
  assert.equal(viewerPath('src:abc-123'), `${VIEWER_PAGE}?k=src%3Aabc-123`);
});

test('viewerPath rejects a missing key', () => {
  assert.throws(() => viewerPath(''), /key is required/i);
  assert.throws(() => viewerPath(null), /key is required/i);
});
