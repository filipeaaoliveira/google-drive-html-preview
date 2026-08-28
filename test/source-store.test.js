import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSourceStore } from '../src/lib/source-store.js';

function fakeArea() {
  const data = new Map();
  return {
    data,
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, v);
    },
    async get(key) {
      return data.has(key) ? { [key]: data.get(key) } : {};
    },
    async remove(key) {
      data.delete(key);
    }
  };
}

test('put stores a payload under a fresh key and take returns it', async () => {
  const area = fakeArea();
  const store = createSourceStore(area);
  const key = await store.put({ source: '<h1>hi</h1>' });
  assert.deepEqual(await store.take(key), { source: '<h1>hi</h1>' });
});

test('take consumes the key so a payload is only readable once', async () => {
  const area = fakeArea();
  const store = createSourceStore(area);
  const key = await store.put({ source: '<h1>hi</h1>' });
  await store.take(key);
  assert.equal(await store.take(key), null);
  assert.equal(area.data.size, 0);
});

test('take returns null for an unknown or missing key', async () => {
  const store = createSourceStore(fakeArea());
  assert.equal(await store.take('src:nope'), null);
  assert.equal(await store.take(null), null);
  assert.equal(await store.take(''), null);
});

test('put generates a distinct key each time', async () => {
  const store = createSourceStore(fakeArea());
  const a = await store.put({ source: 'a' });
  const b = await store.put({ source: 'b' });
  assert.notEqual(a, b);
});
