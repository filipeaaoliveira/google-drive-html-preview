import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldConsiderPreview, shouldConsiderOverlayPreview } from '../src/lib/decide.js';

const VIEW = 'https://drive.google.com/file/d/1AbC/view';

test('considers a Drive HTML file when enabled', () => {
  assert.deepEqual(
    shouldConsiderPreview({ href: VIEW, title: 'page.html - Google Drive', enabled: true }),
    { consider: true, fileId: '1AbC', reason: 'ok' }
  );
});

test('declines when the extension is disabled', () => {
  const result = shouldConsiderPreview({
    href: VIEW,
    title: 'page.html - Google Drive',
    enabled: false
  });
  assert.equal(result.consider, false);
  assert.equal(result.reason, 'disabled');
});

test('declines when the escape-hatch parameter is present', () => {
  const result = shouldConsiderPreview({
    href: `${VIEW}?nopreview=1`,
    title: 'page.html - Google Drive',
    enabled: true
  });
  assert.equal(result.consider, false);
  assert.equal(result.reason, 'nopreview-flag');
});

test('declines for a non-Drive-file URL', () => {
  const result = shouldConsiderPreview({
    href: 'https://drive.google.com/drive/my-drive',
    title: 'page.html - Google Drive',
    enabled: true
  });
  assert.equal(result.consider, false);
  assert.equal(result.reason, 'not-a-drive-file');
});

test('declines while the title is not yet an HTML filename', () => {
  for (const title of ['Google Drive', '', 'report.pdf - Google Drive']) {
    const result = shouldConsiderPreview({ href: VIEW, title, enabled: true });
    assert.equal(result.consider, false, `title: ${title}`);
    assert.equal(result.reason, 'title-not-html');
  }
});

test('the disabled check short-circuits before anything else', () => {
  const result = shouldConsiderPreview({ href: 'garbage', title: 'x', enabled: false });
  assert.equal(result.reason, 'disabled');
});

// --- overlay path ---------------------------------------------------------

const OVERLAY_ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';

test('considers an HTML file opened in Drive\'s overlay', () => {
  assert.deepEqual(
    shouldConsiderOverlayPreview({
      fileId: OVERLAY_ID,
      name: 'candidate-ingestion-routes.html',
      enabled: true
    }),
    { consider: true, fileId: OVERLAY_ID, reason: 'ok' }
  );
});

test('the overlay disabled check short-circuits before id validation', () => {
  const result = shouldConsiderOverlayPreview({
    fileId: '../garbage',
    name: 'page.html',
    enabled: false
  });
  assert.equal(result.consider, false);
  assert.equal(result.reason, 'disabled');
});

test('declines an overlay id that does not look like a Drive id', () => {
  for (const fileId of ['', 'short', '../x', null, undefined]) {
    const result = shouldConsiderOverlayPreview({ fileId, name: 'page.html', enabled: true });
    assert.equal(result.consider, false, `fileId: ${String(fileId)}`);
    assert.equal(result.reason, 'bad-file-id');
  }
});

test('declines an overlay file whose name is not HTML', () => {
  for (const name of ['clip.mov', '', '.html', null]) {
    const result = shouldConsiderOverlayPreview({ fileId: OVERLAY_ID, name, enabled: true });
    assert.equal(result.consider, false, `name: ${String(name)}`);
    assert.equal(result.reason, 'name-not-html');
  }
});
