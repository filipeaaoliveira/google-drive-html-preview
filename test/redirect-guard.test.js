import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRedirectGuard } from '../src/lib/redirect-guard.js';

const ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';
const OTHER = '2xYqq9-aaBBccDDeeFFggHHiiJJkkLLmm';

function fakeClock() {
  const clock = { t: 1000 };
  return { clock, now: () => clock.t };
}

test('allows the first redirect for a file id', () => {
  const guard = createRedirectGuard();
  assert.equal(guard.shouldRedirect(ID), true);
});

test('refuses an immediate repeat for the same file id', () => {
  const guard = createRedirectGuard();
  assert.equal(guard.shouldRedirect(ID), true);
  assert.equal(guard.shouldRedirect(ID), false);
  assert.equal(guard.shouldRedirect(ID), false);
});

test('allows the same file id again once the window has elapsed', () => {
  const { clock, now } = fakeClock();
  const guard = createRedirectGuard({ now, windowMs: 5000 });

  assert.equal(guard.shouldRedirect(ID), true);
  clock.t += 4999;
  assert.equal(guard.shouldRedirect(ID), false, 'still inside the window');
  clock.t += 2;
  assert.equal(guard.shouldRedirect(ID), true, 'the window has passed');
  assert.equal(guard.shouldRedirect(ID), false, 'and the new allow restarts it');
});

test("one file id's cooldown does not block a different file", () => {
  const guard = createRedirectGuard();
  assert.equal(guard.shouldRedirect(ID), true);
  assert.equal(guard.shouldRedirect(OTHER), true);
  assert.equal(guard.shouldRedirect(ID), false);
  assert.equal(guard.shouldRedirect(OTHER), false);
});

test('a refused call does not extend the cooldown', () => {
  const { clock, now } = fakeClock();
  const guard = createRedirectGuard({ now, windowMs: 5000 });

  assert.equal(guard.shouldRedirect(ID), true);
  clock.t += 4000;
  assert.equal(guard.shouldRedirect(ID), false);
  clock.t += 1001;
  assert.equal(guard.shouldRedirect(ID), true);
});
