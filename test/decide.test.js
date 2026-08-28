import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldConsiderPreview } from '../src/lib/decide.js';

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
