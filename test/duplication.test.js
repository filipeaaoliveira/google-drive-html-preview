import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// MV3 content scripts cannot import, so content.js has to carry its own copy of
// a few helpers. Those copies are compared against the shared ones at runtime:
// the content script reads a name out of Drive's DOM and the service worker
// checks it against what Drive returned. If the two normalise differently, that
// comparison fails in ways no other test would notice.
//
// The source comments ask a human to keep them in step. These tests make CI ask.

const content = await readFile('src/content/content.js', 'utf8');
const target = await readFile('src/lib/target.js', 'utf8');
const filename = await readFile('src/lib/filename.js', 'utf8');

function regexLiteral(source, name) {
  const match = new RegExp(`const ${name} = (/.*/[a-z]*);`).exec(source);
  assert.ok(match, `expected a regex literal named ${name}`);
  return match[1];
}

// Everything after the opening brace of `function name(` up to the first line
// that closes it, stripped of indentation so copies at different nesting depths
// compare equal.
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `expected a function named ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return source
          .slice(open + 1, i)
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== '' && !line.startsWith('//'))
          .join('\n');
      }
    }
  }
  assert.fail(`unbalanced braces in ${name}`);
}

test('the file id pattern is defined once and copied verbatim', () => {
  assert.equal(regexLiteral(content, 'DRIVE_FILE_ID'), regexLiteral(target, 'DRIVE_FILE_ID'));
});

test('the html extension pattern is copied verbatim', () => {
  assert.equal(regexLiteral(content, 'HTML_NAME'), regexLiteral(filename, 'HTML_EXTENSION'));
});

test('cleanLabel matches cleanDisplayName', () => {
  assert.equal(functionBody(content, 'cleanLabel'), functionBody(target, 'cleanDisplayName'));
});

test('labelNamesFile matches labelContainsName', () => {
  // The copies differ by one deliberate rename of the helper they call. That is
  // naming, not logic, so normalise it and compare the rest exactly.
  const shared = functionBody(target, 'labelContainsName').replaceAll('cleanDisplayName', 'cleanLabel');
  assert.equal(functionBody(content, 'labelNamesFile'), shared);
});

test('no module outside content.js redefines the file id pattern', async () => {
  // One shared definition in target.js, one unavoidable copy in content.js.
  const files = ['drive-url.js', 'fetch-drive.js', 'decide.js', 'filename.js', 'source-store.js'];
  for (const file of files) {
    const source = await readFile(`src/lib/${file}`, 'utf8');
    assert.doesNotMatch(source, /\[A-Za-z0-9_-\]\{?[0-9]*,?\}?\$/, `${file} redefines the id pattern`);
  }
});
