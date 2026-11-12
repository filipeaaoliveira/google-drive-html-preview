import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInFlight } from '../src/lib/in-flight.js';

// A task the test finishes by hand, so calls can overlap it.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('a second call for a key that is still running shares the first run', async () => {
  const inFlight = createInFlight();
  const gate = deferred();
  let runs = 0;
  const task = () => {
    runs += 1;
    return gate.promise;
  };

  const first = inFlight.run('a', task);
  const second = inFlight.run('a', task);
  gate.resolve('done');

  assert.deepEqual(await Promise.all([first, second]), ['done', 'done']);
  assert.equal(runs, 1);
});

test('different keys run independently', async () => {
  const inFlight = createInFlight();
  let runs = 0;
  const task = async () => {
    runs += 1;
    return runs;
  };

  await Promise.all([inFlight.run('a', task), inFlight.run('b', task)]);

  assert.equal(runs, 2);
});

test('a key is released when its run finishes, so a later call runs again', async () => {
  const inFlight = createInFlight();
  let runs = 0;
  const task = async () => {
    runs += 1;
  };

  await inFlight.run('a', task);
  await inFlight.run('a', task);

  assert.equal(runs, 2);
  assert.equal(inFlight.size, 0);
});

test('a failed run rejects every caller that shared it, then releases the key', async () => {
  const inFlight = createInFlight();
  const gate = deferred();

  const first = inFlight.run('a', () => gate.promise);
  const second = inFlight.run('a', () => gate.promise);
  gate.reject(new Error('network'));

  await assert.rejects(first, /network/);
  await assert.rejects(second, /network/);
  assert.equal(inFlight.size, 0);
});

test('a task that throws synchronously becomes a rejection, not a throw from run()', async () => {
  const inFlight = createInFlight();
  const promise = inFlight.run('a', () => {
    throw new Error('boom');
  });

  await assert.rejects(promise, /boom/);
  assert.equal(inFlight.size, 0);
});
