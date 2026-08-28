# Drive HTML Preview

[![CI](https://github.com/filipeaaoliveira/google-drive-html-preview/actions/workflows/ci.yml/badge.svg)](https://github.com/filipeaaoliveira/google-drive-html-preview/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Google Drive shows HTML files as source code. This Chromium extension renders
them as web pages instead.

Google retired Drive's own web hosting in 2016 and no setting brings it back, so
the fix has to run in the browser.

## How it works

A content script on Drive's pages reports what it sees to the service worker. On
a `/file/d/<id>/view` url that means the page title: when the title names an
`.html` or `.htm` file, the extension acts on it. Drive usually opens a file in
an overlay on top of the folder instead, which leaves the url and the title
unchanged, so the content script also watches for that overlay and reads the
file's identity from the DOM.

Google can rearrange that DOM at any time, and rendering the wrong file would be
worse than rendering nothing. Three independent checks therefore have to agree
before an overlay preview happens:

1. The visible dialog names an `.html` or `.htm` file. A closed `aria-hidden`
   dialog left over from an earlier preview never counts.
2. Exactly one selected row carries a Drive file id and the same name.
3. The service worker confirms that the filename Drive returns in
   `Content-Disposition` matches the name it expected.

Disagreement, ambiguity, or a missing filename cancels the redirect and leaves
Drive's own behaviour intact.

Once the extension has identified a file, the service worker downloads it with
your existing Google session, stashes the source under a single-use key, and
hands back a viewer URL. It asks for no OAuth scopes, shows no consent screen,
and uses no Drive API. The viewer embeds a sandboxed frame, and your HTML runs
inside that frame in an opaque origin with no access to extension APIs,
extension storage, or your cookies.

The extension transmits no file content anywhere. It has no server component, no
analytics, and no telemetry. See `docs/PRIVACY.md`.

## Permissions

`storage`, plus host permissions for `https://drive.google.com/*` and
`https://drive.usercontent.google.com/*`. Nothing else.

## Scope

The extension assumes a file is self-contained: everything inline, or loaded
from public CDNs.

## Known limitations

The extension does not handle the cases below, and that is deliberate.

Multi-file sites are out of scope. HTML that references sibling Drive files for
CSS, JavaScript, or images will not resolve them.

Mislabelled encodings render as mojibake. The browser decodes the bytes using the
`charset` in Drive's `Content-Type` response header, and as UTF-8 when that header
names none. A correctly labelled Latin-1 or Shift-JIS file therefore
renders fine. One served without a charset, or with the wrong one, does not.

Some Drive interstitials go undetected. A page served from a Drive host with
HTTP 200 and no `Content-Disposition` header, such as the virus-scan
confirmation shown for files over 100 MB, is indistinguishable from your own
document, and the extension may render it as one. A signed-out user *is* detected, because
that case redirects off the Drive hosts, and gets a clear message instead.

Stashed sources are not expired. If you close the tab before the viewer loads,
that file's source stays in `chrome.storage.session` until the browser session
ends.

A bare file URL is not recognised. `https://drive.google.com/file/d/<id>` with
no trailing path segment (`/view`, `/edit`) does not match.

## Install

Chrome and Brave, from the unlisted Chrome Web Store link.

To run from source: clone the repository, open `chrome://extensions`, enable
Developer mode, choose "Load unpacked", and select the repository root. There
is no build step.

Loading the repository root unpacked also exposes the tests, the docs and the
tooling to the browser. That works for development and breaks distribution. What
gets submitted to the Chrome Web Store is the zip produced by `npm run package`,
which contains only `manifest.json`, `icons/`, and `src/`.

## Development

    npm test                   # unit tests, no dependencies
    npm run package            # build dist/drive-html-preview-<version>.zip
    node tools/make-icons.js   # regenerate icons

The project has no dependencies. `npm test` and the icon generator run on
Node's built-ins alone. `npm run package` shells out to the `zip` command that
ships with macOS and Linux.

Unit tests cover all of `src/lib/`, plus the service worker (driven through a
stubbed `chrome` namespace), the sandbox page, and the content script's DOM
reader (evaluated in a `vm` against a fake Drive document).

The viewer page, the popup, and the content script's observer wiring have no
automated coverage. You check those by hand, in Chrome and in Brave.

`docs/PRIVACY.md` is the privacy policy, published at
https://filipeaaoliveira.github.io/google-drive-html-preview/PRIVACY.html

CI runs the suite on Node 22 and 24, builds the zip, and fails the build if the
zip picks up anything outside `manifest.json`, `icons/` and `src/`.

## Contributing

`CONTRIBUTING.md` covers the layout of the code, the two rules that carry the
security model, and what you have to check by hand because nothing automated
covers it. `CHANGELOG.md` records what changed between releases.

Report security issues privately through
[GitHub's advisory form](https://github.com/filipeaaoliveira/google-drive-html-preview/security/advisories/new)
rather than as a public issue. `SECURITY.md` explains what counts as a
vulnerability in an extension whose job is rendering untrusted HTML.

## License

MIT. See `LICENSE`.
