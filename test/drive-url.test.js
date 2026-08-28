import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDriveFileId, hasNoPreviewFlag, driveViewUrl } from '../src/lib/drive-url.js';

test('parseDriveFileId extracts the id from a file view URL', () => {
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbC-_dEf/view'),
    '1AbC-_dEf'
  );
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbC-_dEf/view?usp=sharing'),
    '1AbC-_dEf'
  );
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbC-_dEf/preview'),
    '1AbC-_dEf'
  );
});

test('parseDriveFileId rejects non-file Drive URLs and other hosts', () => {
  assert.equal(parseDriveFileId('https://drive.google.com/drive/my-drive'), null);
  assert.equal(parseDriveFileId('https://docs.google.com/file/d/1AbC/view'), null);
  assert.equal(parseDriveFileId('https://evil.example/file/d/1AbC/view'), null);
  assert.equal(parseDriveFileId('not a url'), null);
  assert.equal(parseDriveFileId(null), null);
});

test('hasNoPreviewFlag detects the escape-hatch parameter', () => {
  assert.equal(
    hasNoPreviewFlag('https://drive.google.com/file/d/1AbC/view?nopreview=1'),
    true
  );
  assert.equal(
    hasNoPreviewFlag('https://drive.google.com/file/d/1AbC/view?usp=x&nopreview=1'),
    true
  );
  assert.equal(hasNoPreviewFlag('https://drive.google.com/file/d/1AbC/view'), false);
  assert.equal(hasNoPreviewFlag('not a url'), false);
});

test('driveViewUrl builds a view URL, optionally with the escape hatch', () => {
  assert.equal(
    driveViewUrl('1AbC'),
    'https://drive.google.com/file/d/1AbC/view'
  );
  assert.equal(
    driveViewUrl('1AbC', { noPreview: true }),
    'https://drive.google.com/file/d/1AbC/view?nopreview=1'
  );
});

test('driveViewUrl rejects an id that is not a plain Drive id', () => {
  assert.throws(() => driveViewUrl('../../evil'), /invalid drive file id/i);
  assert.throws(() => driveViewUrl(''), /invalid drive file id/i);
});
