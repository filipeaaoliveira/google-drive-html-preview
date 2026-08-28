import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// content.js is a classic script, so it is loaded here the way Chrome loads it:
// evaluated in a context holding stub globals. It exposes its DOM reader on
// globalThis (the isolated world in the browser, never the page).

const SOURCE = await readFile('src/content/content.js', 'utf8');
const ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';

function element({ children = [], ...attrs } = {}) {
  const el = {
    attrs,
    children,
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    querySelectorAll: (selector) => descendants(el).filter((node) => matches(node, selector))
  };
  return el;
}

function descendants(el) {
  return el.children.flatMap((child) => [child, ...descendants(child)]);
}

function matches(el, selector) {
  if (selector === '[aria-label]') return typeof el.attrs['aria-label'] === 'string';
  if (selector === '[role="dialog"]') return el.attrs.role === 'dialog';
  if (selector === '[aria-selected="true"][data-id]') {
    return el.attrs['aria-selected'] === 'true' && typeof el.attrs['data-id'] === 'string';
  }
  throw new Error(`unexpected selector: ${selector}`);
}

function makeDocument(roots) {
  const body = element({ children: roots });
  return {
    title: 'Home - Google Drive',
    head: element(),
    documentElement: body,
    body,
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    addEventListener() {}
  };
}

function loadReader() {
  const context = {
    document: makeDocument([]),
    location: { href: 'https://drive.google.com/drive/home', replace() {} },
    chrome: { runtime: { sendMessage: async () => ({ redirectTo: null }) } },
    setTimeout,
    clearTimeout,
    Date,
    Set,
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    addEventListener() {}
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  const read = context.__driveHtmlPreviewReadOverlayTarget;
  assert.equal(typeof read, 'function', 'content.js must expose its overlay reader');
  return read;
}

const read = loadReader();

const listRow = (name, id) =>
  element({ 'aria-selected': 'true', 'data-id': id, 'aria-label': `${name} HTML` });

const openDialog = (name) =>
  element({
    role: 'dialog',
    'aria-label': `Displaying ${name}.`,
    children: [
      element({ 'aria-label': `HTML, ${name}.` }),
      element({ 'aria-label': name })
    ]
  });

const staleVideoDialog = () =>
  element({
    role: 'dialog',
    'aria-hidden': 'true',
    'aria-label': 'Displaying IMG_1292.MOV.',
    children: [element({ 'aria-label': 'IMG_1292.MOV' })]
  });

test('reads the file id and name from a visible HTML overlay', () => {
  const name = 'candidate-ingestion-routes.html';
  // spread: the reader returns an object from the vm realm, so compare values
  const target = read(makeDocument([openDialog(name), listRow(name, ID)]));
  assert.deepEqual({ ...target }, { fileId: ID, name });
});

test('ignores a stale aria-hidden dialog for a previously previewed file', () => {
  const name = 'candidate-ingestion-routes.html';
  const doc = makeDocument([staleVideoDialog(), openDialog(name), listRow(name, ID)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

test('returns null when the only dialog is the stale hidden one', () => {
  assert.equal(read(makeDocument([staleVideoDialog(), listRow('IMG_1292.MOV', ID)])), null);
});

test('returns null when no dialog is open', () => {
  assert.equal(read(makeDocument([listRow('report.html', ID)])), null);
});

test('returns null when the open file is not HTML', () => {
  const doc = makeDocument([openDialog('slides.pdf'), listRow('slides.pdf', ID)]);
  assert.equal(read(doc), null);
});

test('returns null when the selected row names a different file', () => {
  const doc = makeDocument([openDialog('report.html'), listRow('other.html', ID)]);
  assert.equal(read(doc), null);
});

test('returns null when more than one row is selected', () => {
  const name = 'report.html';
  const doc = makeDocument([
    openDialog(name),
    listRow(name, ID),
    listRow(name, '2xYqq9-aaBBccDDeeFFggHHiiJJkkLLmm')
  ]);
  assert.equal(read(doc), null);
});

test('returns null when no row is selected', () => {
  const doc = makeDocument([openDialog('report.html')]);
  assert.equal(read(doc), null);
});

test('returns null when the selected row carries a bogus id', () => {
  const name = 'report.html';
  const doc = makeDocument([
    openDialog(name),
    element({ 'aria-selected': 'true', 'data-id': '../x', 'aria-label': `${name} HTML` })
  ]);
  assert.equal(read(doc), null);
});

test('content.js stays a classic script with no imports', async () => {
  assert.doesNotMatch(SOURCE, /^\s*import\s/m);
  assert.doesNotMatch(SOURCE, /\bfrom\s+['"]\.\.\//);
  assert.doesNotMatch(SOURCE, /\bsrc\/lib\b/);
});

test('keeps a filename that contains spaces intact', () => {
  const name = 'my quarterly report.html';
  const doc = makeDocument([openDialog(name), listRow(name, ID)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});
