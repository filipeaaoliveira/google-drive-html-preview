import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSettings } from '../src/lib/settings.js';

function fakeArea(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, v);
    },
    async get(key) {
      return data.has(key) ? { [key]: data.get(key) } : {};
    }
  };
}

test('isEnabled defaults to true when nothing is stored', async () => {
  assert.equal(await createSettings(fakeArea()).isEnabled(), true);
});

test('isEnabled reflects a stored false', async () => {
  const settings = createSettings(fakeArea({ enabled: false }));
  assert.equal(await settings.isEnabled(), false);
});

test('setEnabled round-trips', async () => {
  const settings = createSettings(fakeArea());
  await settings.setEnabled(false);
  assert.equal(await settings.isEnabled(), false);
  await settings.setEnabled(true);
  assert.equal(await settings.isEnabled(), true);
});
