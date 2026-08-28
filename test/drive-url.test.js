import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDriveFileId, hasNoPreviewFlag, driveViewUrl } from '../src/lib/drive-url.js';

test('parseDriveFileId extracts the id from a file view URL', () => {
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123/view'),
    '1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123'
  );
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123/view?usp=sharing'),
    '1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123'
  );
  assert.equal(
    parseDriveFileId('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123/preview'),
    '1AbCdEf_gH-ijkLMNopQRstUVwxyz0123dEf_gH-ijkLMNopQRstUVwxyz0123'
  );
});

test('parseDriveFileId rejects non-file Drive URLs and other hosts', () => {
  assert.equal(parseDriveFileId('https://drive.google.com/drive/my-drive'), null);
  assert.equal(parseDriveFileId('https://docs.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view'), null);
  assert.equal(parseDriveFileId('https://evil.example/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view'), null);
  assert.equal(parseDriveFileId('not a url'), null);
  assert.equal(parseDriveFileId(null), null);
});

test('hasNoPreviewFlag detects the escape-hatch parameter', () => {
  assert.equal(
    hasNoPreviewFlag('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view?nopreview=1'),
    true
  );
  assert.equal(
    hasNoPreviewFlag('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view?usp=x&nopreview=1'),
    true
  );
  assert.equal(hasNoPreviewFlag('https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view'), false);
  assert.equal(hasNoPreviewFlag('not a url'), false);
});

test('driveViewUrl builds a view URL, optionally with the escape hatch', () => {
  assert.equal(
    driveViewUrl('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123'),
    'https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view'
  );
  assert.equal(
    driveViewUrl('1AbCdEf_gH-ijkLMNopQRstUVwxyz0123', { noPreview: true }),
    'https://drive.google.com/file/d/1AbCdEf_gH-ijkLMNopQRstUVwxyz0123/view?nopreview=1'
  );
});

test('driveViewUrl rejects an id that is not a plain Drive id', () => {
  assert.throws(() => driveViewUrl('../../evil'), /invalid drive file id/i);
  assert.throws(() => driveViewUrl(''), /invalid drive file id/i);
});
