import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDriveFileId, cleanDisplayName, namesMatch } from '../src/lib/target.js';

const REAL_ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';

test('accepts a real Drive file id', () => {
  assert.equal(isDriveFileId(REAL_ID), true);
});

test('rejects ids that are empty, short, path-like or not strings', () => {
  for (const value of ['', '../x', 'abc', 'short', '1AbC/../x', null, undefined, 42, {}]) {
    assert.equal(isDriveFileId(value), false, `value: ${String(value)}`);
  }
});

test('cleanDisplayName trims, collapses whitespace and strips one trailing dot', () => {
  assert.equal(cleanDisplayName('  report.html  '), 'report.html');
  assert.equal(cleanDisplayName('report.html.'), 'report.html');
  assert.equal(cleanDisplayName('HTML,  report.html.'), 'HTML, report.html');
  assert.equal(cleanDisplayName('a\n b.html'), 'a b.html');
});

test('cleanDisplayName returns the empty string for non-strings', () => {
  for (const value of [null, undefined, 7, {}, []]) {
    assert.equal(cleanDisplayName(value), '');
  }
});

test('namesMatch is true for equal names, before and after cleaning', () => {
  assert.equal(namesMatch('report.html', 'report.html'), true);
  assert.equal(namesMatch('  report.html. ', 'report.html'), true);
});

test('namesMatch is case-sensitive: two cases are two different files', () => {
  assert.equal(namesMatch('Report.html', 'report.html'), false);
});

test('namesMatch is false when either name is empty or missing', () => {
  assert.equal(namesMatch('', 'report.html'), false);
  assert.equal(namesMatch('report.html', ''), false);
  assert.equal(namesMatch('report.html', null), false);
  assert.equal(namesMatch(undefined, undefined), false);
  assert.equal(namesMatch('   ', 'report.html'), false);
});
