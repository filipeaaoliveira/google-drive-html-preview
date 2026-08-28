import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// sandbox.js is the page the user's untrusted HTML runs in. It accepts a single
// message and writes its payload straight into the document, so the check on
// who sent that message is the only thing standing between "the viewer decided
// what to render" and "anything holding a handle to this frame decided".
//
// It needs no chrome APIs, just a window and a document, so it can be driven
// directly rather than left to manual testing.

const SOURCE = await readFile('src/sandbox/sandbox.js', 'utf8');

function run() {
  const written = [];
  const parent = { name: 'parent' };
  let handler = null;

  const context = {
    window: {
      parent,
      addEventListener(type, fn) {
        if (type === 'message') handler = fn;
      }
    },
    document: {
      open() {},
      write(html) {
        written.push(html);
      },
      close() {}
    }
  };
  vm.createContext(context);
  vm.runInContext(SOURCE, context);

  assert.ok(handler, 'sandbox.js must register a message listener');
  return { written, parent, send: (event) => handler(event) };
}

test('renders a RENDER message sent by the parent frame', () => {
  const { written, parent, send } = run();
  send({ source: parent, data: { type: 'RENDER', source: '<h1>hi</h1>' } });
  assert.deepEqual(written, ['<h1>hi</h1>']);
});

test('ignores a RENDER message from anyone other than the parent frame', () => {
  const { written, send } = run();
  send({ source: { name: 'someone else' }, data: { type: 'RENDER', source: '<h1>evil</h1>' } });
  assert.deepEqual(written, [], 'only the parent frame may choose what is rendered');
});

test('ignores a message from the parent that is not a RENDER', () => {
  const { written, parent, send } = run();
  send({ source: parent, data: { type: 'SOMETHING_ELSE', source: '<h1>no</h1>' } });
  assert.deepEqual(written, []);
});

test('ignores a message with no data at all', () => {
  const { written, parent, send } = run();
  send({ source: parent, data: null });
  assert.deepEqual(written, []);
});
