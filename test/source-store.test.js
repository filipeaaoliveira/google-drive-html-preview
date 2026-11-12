import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSourceStore } from '../src/lib/source-store.js';

// Mirrors chrome.storage: get(null) returns everything, remove() takes a key or
// an array of keys. getKeys() is optional because it only exists from Chrome 130.
function fakeArea({ withGetKeys = true } = {}) {
  const data = new Map();
  const area = {
    data,
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, v);
    },
    async get(key) {
      if (key === null) return Object.fromEntries(data);
      return data.has(key) ? { [key]: data.get(key) } : {};
    },
    async remove(keys) {
      for (const k of [].concat(keys)) data.delete(k);
    }
  };
  if (withGetKeys) area.getKeys = async () => [...data.keys()];
  return area;
}

// A clock the test moves by hand.
function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
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

test('put removes a payload no viewer took once it is older than the limit', async () => {
  const area = fakeArea();
  const time = clock();
  const store = createSourceStore(area, { now: time.now, maxAgeMs: 60000 });

  const abandoned = await store.put({ source: 'never taken' });
  time.advance(60000);
  const fresh = await store.put({ source: 'new' });

  assert.equal(area.data.has(abandoned), false, 'an abandoned payload must not hold quota');
  assert.deepEqual(await store.take(fresh), { source: 'new' });
});

test('put keeps a payload younger than the limit, since its viewer may still be loading', async () => {
  const area = fakeArea();
  const time = clock();
  const store = createSourceStore(area, { now: time.now, maxAgeMs: 60000 });

  const pending = await store.put({ source: 'in flight' });
  time.advance(59999);
  await store.put({ source: 'another' });

  assert.deepEqual(await store.take(pending), { source: 'in flight' });
});

test('put removes payloads written by an earlier version, whose keys carry no time', async () => {
  const area = fakeArea();
  area.data.set('src:529a6eac-e575-44a9-9d3c-aef5fa5967d2', { source: 'left over' });
  const store = createSourceStore(area);

  await store.put({ source: 'new' });

  assert.equal(area.data.has('src:529a6eac-e575-44a9-9d3c-aef5fa5967d2'), false);
});

test('put leaves keys outside the store alone', async () => {
  const area = fakeArea();
  area.data.set('other', 'kept');
  const time = clock();
  const store = createSourceStore(area, { now: time.now, maxAgeMs: 10 });

  time.advance(1000);
  await store.put({ source: 'new' });

  assert.equal(area.data.get('other'), 'kept');
});

test('put removes stale payloads on browsers without getKeys', async () => {
  const area = fakeArea({ withGetKeys: false });
  const time = clock();
  const store = createSourceStore(area, { now: time.now, maxAgeMs: 100 });

  const abandoned = await store.put({ source: 'never taken' });
  time.advance(100);
  await store.put({ source: 'new' });

  assert.equal(area.data.has(abandoned), false);
});

test('put still stores the payload when removing stale ones fails', async () => {
  const area = fakeArea();
  area.getKeys = async () => {
    throw new Error('storage unavailable');
  };
  const store = createSourceStore(area);

  const key = await store.put({ source: 'new' });

  assert.deepEqual(await store.take(key), { source: 'new' });
});
