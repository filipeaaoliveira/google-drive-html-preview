import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('manifest is valid JSON and declares the sandbox page', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.sandbox.pages, ['src/sandbox/sandbox.html']);
  assert.equal(manifest.background.type, 'module');
});

test('manifest requests no permissions beyond storage', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, [
    'https://drive.google.com/*',
    'https://drive.usercontent.google.com/*'
  ]);
});
