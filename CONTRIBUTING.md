# Contributing

Thanks for taking a look. This is a small extension with no dependencies and no
build step, so getting started takes about a minute.

## Setup

    git clone https://github.com/filipeaaoliveira/google-drive-html-preview.git
    cd google-drive-html-preview
    npm test

There is nothing to install. The tests run on Node's built-in test runner and
need Node 22 or newer. To load the extension, open `chrome://extensions`, turn
on Developer mode, choose "Load unpacked" and select the repository root. Brave
uses the same screen at `brave://extensions`.

After changing any file, click reload on the extension's card. Content script
and service worker changes need that reload before they take effect.

## How the code is arranged

`src/lib/` holds every decision the extension makes, as pure functions with no
reference to the `chrome` global. That is what makes them testable under Node,
and it is the rule most worth preserving:

- `filename.js` decides whether a name is HTML and parses `Content-Disposition`
- `drive-url.js` parses Drive file URLs and the `nopreview` escape hatch
- `decide.js` decides whether a page or an overlay is worth acting on
- `fetch-drive.js` downloads a file with the user's session and classifies it
- `target.js` normalises and compares the names read out of Drive's DOM
- `source-store.js` hands a file's source to the viewer under a single-use key
- `settings.js` reads and writes the on/off toggle
- `redirect-guard.js` stops the same file redirecting twice in quick succession
- `messages.js` builds the viewer URL

Four browser surfaces consume those functions:

- `src/content/content.js` watches Drive and reports what it sees. It is a
  classic script because MV3 content scripts cannot be ES modules, so it holds
  no decisions of its own.
- `src/background/service-worker.js` makes every decision and does every fetch
- `src/viewer/` is the trusted page with the toolbar
- `src/sandbox/` is where the user's HTML actually runs

## Two rules that carry the security model

The user's HTML is untrusted code. Two mechanisms keep it away from the
extension, and both are load-bearing:

The viewer's iframe must never gain `allow-same-origin`. Combined with
`allow-scripts`, that would drop the opaque origin and let a viewed document
reach extension storage and `chrome.*` APIs.

The sandbox page must keep rendering through `document.write`. Switching to
`srcdoc` or `innerHTML` reintroduces the extension-page content security policy,
which the sandbox exists to escape, and would silently break every inline and
CDN script in a viewed file.

`test/harness.test.js` pins both, along with the manifest's sandbox policy. If
you change one of them on purpose, change the test in the same commit and say
why in the message.

## Tests

Add tests for anything in `src/lib/`. The suite is fast and has no fixtures to
set up.

Then check that a new test can actually fail. Break the code it covers, run
`npm test`, and confirm that test goes red. A test that passes against broken
code is worse than no test, because it reads like coverage.

## What has no automated coverage

The browser surfaces are not unit tested, because mocking the whole `chrome`
namespace would test the mock. Check these by hand in Chrome and in Brave with
default shields before opening a pull request that touches them:

- open an HTML file from a folder listing, where Drive uses an overlay and the
  URL never changes
- open one through a `/file/d/<id>/view` link
- open a PDF and a Google Doc, which must not redirect
- preview a video, close it, then open an HTML file, which catches the closed
  dialog Drive leaves in the DOM
- the toolbar's View source, Reload and Back to Drive
- reload the viewer tab, which should explain itself rather than go blank
- the popup toggle, off and on

Brave matters on its own. Its shields affect cookies, and the user's Google
session cookie is the extension's only means of authentication.

## Debugging Drive's DOM

Drive is a single-page application whose markup Google changes without notice.
When the overlay stops triggering, read what the page actually exposes before
changing any code:

```js
(() => {
  const isId = /^[-\w]{25,}$/;
  return {
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => ({
      ariaHidden: d.getAttribute('aria-hidden'),
      label: d.getAttribute('aria-label'),
      renders: !!(d.offsetWidth || d.offsetHeight || d.getClientRects().length)
    })),
    selectedRows: [...document.querySelectorAll('[aria-selected="true"][data-id]')]
      .map(e => ({ id: e.getAttribute('data-id'), label: e.getAttribute('aria-label') }))
  };
})()
```

Run it in the console on the Drive tab with a file open. Note that
`globalThis.__driveHtmlPreviewReadOverlayTarget` exists only in the content
script's isolated world, so reaching it means switching the console's context
dropdown from `top` to the extension.

## Pull requests

Keep commits focused and write them in the imperative mood, as in "fix the
overlay name lookup". CI runs the suite on Node 22 and 24, builds the zip, and
checks that the zip holds only the runtime files.

Say in the description what you verified by hand and in which browsers. For
anything touching the sandbox, the viewer or the content script, that is the
only evidence there is.
