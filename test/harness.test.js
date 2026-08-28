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

test('sandbox CSP grants the viewed document inline and CDN script execution', async () => {
  const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
  assert.equal(
    manifest.content_security_policy.sandbox,
    "sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src https:; frame-src 'self' https: data:; child-src 'self' https: data:;"
  );
});
