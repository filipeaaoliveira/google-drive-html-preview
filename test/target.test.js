import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDriveFileId,
  cleanDisplayName,
  namesMatch,
  labelContainsName,
  safeDriveReturnUrl
} from '../src/lib/target.js';

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

test('labelContainsName matches a name that is the whole label', () => {
  assert.equal(labelContainsName('report.html', 'report.html'), true);
});

test('labelContainsName matches a name bounded by spaces or commas', () => {
  assert.equal(labelContainsName('HTML, report.html', 'report.html'), true);
  assert.equal(labelContainsName('report.html HTML', 'report.html'), true);
  assert.equal(labelContainsName('Shared, report.html, owned by you', 'report.html'), true);
  assert.equal(labelContainsName('  report.html.  ', 'report.html'), true);
});

test('labelContainsName rejects a name that is only part of a longer word', () => {
  assert.equal(labelContainsName('myreport.html HTML', 'report.html'), false);
  assert.equal(labelContainsName('banana.html HTML', 'a.html'), false);
  assert.equal(labelContainsName('report.htmlx', 'report.html'), false);
});

test('labelContainsName is false when either side is empty', () => {
  assert.equal(labelContainsName('', 'report.html'), false);
  assert.equal(labelContainsName('report.html HTML', ''), false);
  assert.equal(labelContainsName(null, null), false);
});

test('safeDriveReturnUrl accepts a Drive folder url unchanged', () => {
  for (const href of [
    'https://drive.google.com/drive/home',
    'https://drive.google.com/drive/folders/abc',
    'https://drive.google.com/drive/u/0/folders/abc?usp=sharing'
  ]) {
    assert.equal(safeDriveReturnUrl(href), href);
  }
});

test('safeDriveReturnUrl rejects anything not on the Drive origin', () => {
  for (const href of [
    'https://drive.usercontent.google.com/download?id=x',
    'https://evil.example/drive/home',
    'https://drive.google.com.evil.example/drive/home',
    'http://drive.google.com/drive/home',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'chrome-extension://abc/src/viewer/viewer.html',
    'not a url',
    '',
    null,
    undefined,
    42,
    { href: 'https://drive.google.com/drive/home' }
  ]) {
    assert.equal(safeDriveReturnUrl(href), null, `href: ${String(href)}`);
  }
});
