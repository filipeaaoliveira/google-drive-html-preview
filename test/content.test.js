import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// content.js is a classic script, so it is loaded here the way Chrome loads it:
// evaluated in a context holding stub globals. It exposes its DOM reader on
// globalThis (the isolated world in the browser, never the page).

const SOURCE = await readFile('src/content/content.js', 'utf8');
const ID = '1gV6mm4-zZd7BklAt-W95qVGkcU2fyMTS';

function element({ children = [], tag = 'div', props = {}, ...attrs } = {}) {
  const el = {
    tag,
    attrs,
    children,
    ...props,
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
  if (selector === 'iframe') return el.tag === 'iframe';
  if (selector === '[data-id]') return typeof el.attrs['data-id'] === 'string';
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

// The real Drive DOM: the selected row carries data-id but NO aria-label of its
// own; the filename label sits on a descendant of that row.
const listRow = (name, id) =>
  element({
    'aria-selected': 'true',
    'data-id': id,
    children: [element({ children: [element({ 'aria-label': `${name} HTML` })] })]
  });

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
  const doc = makeDocument([openDialog(name), listRow(name, '../x')]);
  assert.equal(read(doc), null);
});

test('returns null when nothing in the selected row\'s subtree names the file', () => {
  const doc = makeDocument([
    openDialog('report.html'),
    element({ 'aria-selected': 'true', 'data-id': ID, children: [element({ 'aria-label': 'More actions' })] })
  ]);
  assert.equal(read(doc), null);
});

test('returns null when the row names a file the dialog name is only part of', () => {
  const doc = makeDocument([openDialog('report.html'), listRow('myreport.html', ID)]);
  assert.equal(read(doc), null);
});

test('content.js stays a classic script with no imports', async () => {
  // MV3 content scripts cannot be ES modules. Assert on module syntax rather
  // than on a path substring: a comment may legitimately name a lib file to
  // point a reader at where a decision moved to.
  const withoutComments = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(withoutComments, /^\s*import\s/m);
  assert.doesNotMatch(withoutComments, /\bimport\s*\(/);
  assert.doesNotMatch(withoutComments, /\bfrom\s+['"]\.\.\//);
  assert.doesNotMatch(withoutComments, /\brequire\s*\(/);
  assert.doesNotMatch(withoutComments, /\bexport\s/);
});

test('keeps a filename that contains spaces intact', () => {
  const name = 'my quarterly report.html';
  const doc = makeDocument([openDialog(name), listRow(name, ID)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

// Drive as observed in November 2026. The preview lives in a same-origin
// iframe at drive.google.com/viewer/main, whose visible dialog is labelled
// "Showing viewer." and holds the file name in "Rename …" and "Displaying …"
// labels. The file's row in the page keeps its data-id but is no longer
// marked aria-selected="true".
const viewerFrame = (name, { width = 1881, height = 1251, sameOrigin = true, dialogHidden = !(width || height), extraLabels = [] } = {}) =>
  element({
    tag: 'iframe',
    props: {
      offsetWidth: width,
      offsetHeight: height,
      contentDocument: sameOrigin
        ? makeDocument([
            element({ role: 'dialog', 'aria-hidden': 'true', 'aria-label': 'Rahasia' }),
            element({
              role: 'dialog',
              'aria-hidden': dialogHidden ? 'true' : null,
              'aria-label': 'Showing viewer.',
              children: [
                element({ role: 'button', 'aria-label': `Rename ${name}` }),
                element({ 'aria-label': `Displaying ${name}.` }),
                ...extraLabels.map((label) => element({ 'aria-label': label }))
              ]
            })
          ])
        : null
    }
  });

const unselectedRow = (name, id) =>
  element({
    tag: 'tr',
    role: 'row',
    'aria-selected': 'false',
    'data-id': id,
    children: [element({ 'aria-label': `${name} HTML Label applied, Rahasia Shared` })]
  });

const OTHER_ID = '3zWrr8-aaBBccDDeeFFggHHiiJJkkLLmm';

test('reads the file id and name when the preview is in Drive\'s viewer frame', () => {
  const name = 'full-funnel-2026-10-30.html';
  const doc = makeDocument([unselectedRow('Conversion', OTHER_ID), unselectedRow(name, ID), viewerFrame(name)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

test('returns null when the viewer frame is closed, even though its last dialog is still in it', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, ID), viewerFrame(name, { width: 0, height: 0 })]);
  assert.equal(read(doc), null);
});

test('returns null when a rendered frame is cross-origin', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, ID), viewerFrame(name, { sameOrigin: false })]);
  assert.equal(read(doc), null);
});

test('finds the preview in a frame while an unrelated dialog is open in the page', () => {
  const name = 'report.html';
  const shareDialog = element({ role: 'dialog', 'aria-label': 'Share', children: [element({ 'aria-label': 'Add people' })] });
  const doc = makeDocument([shareDialog, unselectedRow(name, ID), viewerFrame(name)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

test('returns null when no row is selected and two rows name the file', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, ID), unselectedRow(name, OTHER_ID), viewerFrame(name)]);
  assert.equal(read(doc), null);
});

test('returns null when no row is selected and a copy\'s name also contains the file name', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, ID), unselectedRow(`Copy of ${name}`, OTHER_ID), viewerFrame(name)]);
  assert.equal(read(doc), null);
});

test('returns null when no row is selected and the only row naming the file has a bogus id', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, '../x'), viewerFrame(name)]);
  assert.equal(read(doc), null);
});

test('returns null when no row is selected and no row names the file', () => {
  const doc = makeDocument([unselectedRow('other.html', ID), viewerFrame('report.html')]);
  assert.equal(read(doc), null);
});

test('a selected row still decides when there is one, even if another row names the file', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, OTHER_ID), listRow(name, ID), viewerFrame(name)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

// Closing the preview shrinks the frame; the frame's size, not its dialog's
// aria-hidden, is what says the preview is gone while Drive catches up.
test('returns null when the viewer frame has no size, even if its dialog is not hidden yet', () => {
  const name = 'report.html';
  const doc = makeDocument([unselectedRow(name, ID), viewerFrame(name, { width: 0, height: 0, dialogHidden: false })]);
  assert.equal(read(doc), null);
});

test('without a selected row, does not fall back to a shorter name that matches another file', () => {
  // "my report.html" is previewed but has no row in this listing; the row for
  // "report.html" is a different file and must not be taken for it.
  const doc = makeDocument([unselectedRow('report.html', OTHER_ID), viewerFrame('my report.html')]);
  assert.equal(read(doc), null);
});

test('without a selected row, returns null when the dialog\'s labels name different files', () => {
  const name = 'report.html';
  const doc = makeDocument([
    unselectedRow(name, ID),
    unselectedRow('notes.html', OTHER_ID),
    viewerFrame(name, { extraLabels: ['notes.html'] })
  ]);
  assert.equal(read(doc), null);
});

test('without a selected row, a name with spaces is matched whole', () => {
  const name = 'my quarterly report.html';
  const doc = makeDocument([unselectedRow('report.html', OTHER_ID), unselectedRow(name, ID), viewerFrame(name)]);
  assert.deepEqual({ ...read(doc) }, { fileId: ID, name });
});

test('returns null when two rows are selected, even if one of them is the only row naming the file', () => {
  const name = 'report.html';
  const otherSelected = element({
    'aria-selected': 'true',
    'data-id': OTHER_ID,
    children: [element({ 'aria-label': 'notes.html HTML' })]
  });
  const doc = makeDocument([listRow(name, ID), otherSelected, viewerFrame(name)]);
  assert.equal(read(doc), null);
});
