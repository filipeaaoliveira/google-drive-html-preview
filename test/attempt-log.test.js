import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttemptLog } from '../src/lib/attempt-log.js';

function at(clock) {
  return createAttemptLog({ now: () => clock.t, windowMs: 2000 });
}

test('a file id is allowed the first time it is seen', () => {
  assert.equal(at({ t: 0 }).shouldAttempt('a'), true);
});

test('a redirect blocks the same file id inside the window', () => {
  const clock = { t: 0 };
  const log = at(clock);
  log.recordRedirect('a');
  clock.t = 1999;
  assert.equal(log.shouldAttempt('a'), false);
});

test('the block lifts once the window has passed', () => {
  const clock = { t: 0 };
  const log = at(clock);
  log.recordRedirect('a');
  clock.t = 2000;
  assert.equal(log.shouldAttempt('a'), true);
});

test('a redirect does not block a different file id', () => {
  const log = at({ t: 0 });
  log.recordRedirect('a');
  assert.equal(log.shouldAttempt('b'), true);
});

test('a durable decline blocks the file id for good', () => {
  const clock = { t: 0 };
  const log = at(clock);
  log.recordDurableDecline('a');
  clock.t = 10_000_000;
  assert.equal(log.shouldAttempt('a'), false);
});

// This is the regression that matters: a transient decline, such as the popup
// toggle being off, must never be recorded. Recording it would leave the file
// unopenable for the life of the page even after the user switches back on.
test('an unrecorded attempt stays allowed, so a transient decline can retry', () => {
  const log = at({ t: 0 });
  assert.equal(log.shouldAttempt('a'), true);
  assert.equal(log.shouldAttempt('a'), true);
});

test('the redirect record is bounded', () => {
  const log = at({ t: 0 });
  for (let i = 0; i < 150; i += 1) log.recordRedirect(`id-${i}`);
  // The oldest entries were evicted, so the first id is allowed again.
  assert.equal(log.shouldAttempt('id-0'), true);
  assert.equal(log.shouldAttempt('id-149'), false);
});

test('the decline record is bounded', () => {
  const log = at({ t: 0 });
  for (let i = 0; i < 150; i += 1) log.recordDurableDecline(`id-${i}`);
  assert.equal(log.shouldAttempt('id-0'), true);
  assert.equal(log.shouldAttempt('id-149'), false);
});
