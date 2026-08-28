# Drive HTML Preview

Google Drive shows HTML files as source code. This Chromium extension renders
them as web pages instead.

Drive's own web hosting was retired in 2016 and no server-side setting brings it
back, so the fix has to run in the browser.

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

Files are assumed to be self-contained: everything inline, or loaded from
public CDNs.

## Known limitations

The extension does not handle the cases below, and that is deliberate.

Multi-file sites are out of scope. HTML that references sibling Drive files for
CSS, JavaScript, or images will not resolve them.

Mislabelled encodings render as mojibake. The downloaded bytes are decoded using
the `charset` in Drive's `Content-Type` response header, and as UTF-8 when that
header names none. A correctly labelled Latin-1 or Shift-JIS file therefore
renders fine. One served without a charset, or with the wrong one, does not.

Some Drive interstitials go undetected. A page served from a Drive host with
HTTP 200 and no `Content-Disposition` header, such as the virus-scan
confirmation shown for files over 100 MB, is indistinguishable from your own
document and may be rendered as one. A signed-out user *is* detected, because
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

Unit tests cover `src/lib/`: filename classification, URL parsing, the preview
decision, the storage layer, and the fetch module. The browser-facing pieces,
meaning the content script, the service worker, the viewer and the sandbox, have
no automated coverage and are checked by hand in Chrome and Brave.

`docs/PRIVACY.md` is the privacy policy, published at
https://filipeaaoliveira.github.io/google-drive-html-preview/PRIVACY.html
