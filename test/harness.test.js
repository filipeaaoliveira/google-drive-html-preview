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

// The sandboxed frame is the security boundary: untrusted HTML runs inside it.
// Adding allow-same-origin would give that HTML the chrome-extension:// origin
// and with it chrome.storage.session, so these tests pin the attribute.

test('the viewer frame is sandboxed without allow-same-origin', async () => {
  const html = await readFile('src/viewer/viewer.html', 'utf8');
  const sandbox = /<iframe\b[^>]*\bsandbox="([^"]*)"/s.exec(html);
  assert.ok(sandbox, 'the viewer iframe must carry a sandbox attribute');
  assert.ok(
    !sandbox[1].includes('allow-same-origin'),
    'allow-same-origin would run untrusted HTML on the extension origin'
  );
});

test('the viewer frame sandbox attribute is exactly the reviewed value', async () => {
  const html = await readFile('src/viewer/viewer.html', 'utf8');
  const sandbox = /<iframe\b[^>]*\bsandbox="([^"]*)"/s.exec(html);
  assert.ok(sandbox, 'the viewer iframe must carry a sandbox attribute');
  assert.equal(
    sandbox[1],
    'allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-downloads'
  );
});

test('viewer.html has no inline script', async () => {
  const html = await readFile('src/viewer/viewer.html', 'utf8');
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  assert.ok(scripts.length > 0, 'viewer.html should load its module script');
  for (const tag of scripts) {
    assert.match(tag, /\bsrc=/, `inline script in viewer.html: ${tag}`);
  }
  assert.doesNotMatch(html, /<script\b[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/);
});

test('the sandbox page renders through document.write only', async () => {
  const js = await readFile('src/sandbox/sandbox.js', 'utf8');
  assert.match(js, /document\.write\(/);
  for (const forbidden of ['innerHTML', 'srcdoc', 'DOMParser']) {
    assert.ok(!js.includes(forbidden), `sandbox.js must not use ${forbidden}`);
  }
});
