# Drive HTML Preview

Google Drive shows HTML files as source code. This Chromium extension renders
them as web pages instead.

Drive's own web hosting was retired in 2016 and there is no server-side setting
that brings it back, so the fix has to run in the browser.

## How it works

A content script on Drive's file-view pages reports the page title to the
service worker. When the title names an `.html` or `.htm` file, the service
worker downloads the file using your existing Google session — no OAuth, no
consent screen, no Drive API scopes — stashes the source under a single-use
key, and hands back a viewer URL. The viewer embeds a sandboxed frame, and that
frame is where your HTML actually runs, in an opaque origin with no access to
extension APIs, extension storage, or your cookies.

File content is never transmitted anywhere. There is no server component, no
analytics, and no telemetry. See `docs/PRIVACY.md`.

## Permissions

`storage`, plus host permissions for `https://drive.google.com/*` and
`https://drive.usercontent.google.com/*`. Nothing else.

## Scope

Files are assumed to be self-contained: everything inline, or loaded from
public CDNs.

## Known limitations

These are accepted, not bugs waiting to be filed.

- **Multi-file sites are out of scope.** HTML that references sibling Drive
  files for CSS, JavaScript, or images will not resolve them.
- **Mislabelled encodings render as mojibake.** The downloaded bytes are
  decoded using the `charset` in Drive's `Content-Type` response header, and as
  UTF-8 when that header names none. A correctly labelled Latin-1 or Shift-JIS
  file therefore renders fine; one served without a charset, or with the wrong
  one, does not.
- **Some Drive interstitials are not detected.** A page served from a Drive
  host with HTTP 200 and no `Content-Disposition` header — the virus-scan
  confirmation shown for files over 100 MB, for instance — is indistinguishable
  from the user's own document and may be rendered as one. A signed-out user
  *is* detected, because that case redirects off the Drive hosts, and gets a
  clear message instead.
- **Stashed sources are not expired.** If a preview is never opened — you close
  the tab before the viewer loads — that file's source stays in
  `chrome.storage.session` until the browser session ends.
- **A bare file URL is not recognised.** `https://drive.google.com/file/d/<id>`
  with no trailing path segment (`/view`, `/edit`) is not matched.

## Install

Chrome and Brave, from the unlisted Chrome Web Store link.

To run from source: clone the repository, open `chrome://extensions`, enable
Developer mode, choose "Load unpacked", and select the repository root. There
is no build step.

Loading the repository root unpacked exposes the *whole* folder to the browser
— tests, docs, tooling, and the `spike/` directory with its second
`manifest.json`. That is fine for development and wrong for distribution. What
gets submitted to the Chrome Web Store is the zip produced by
`npm run package`, which contains only `manifest.json`, `icons/`, and `src/`.

## Development

    npm test                   # unit tests, no dependencies
    npm run package            # build dist/drive-html-preview-<version>.zip
    node tools/make-icons.js   # regenerate icons

The project has no dependencies. `npm test` and the icon generator run on
Node's built-ins alone; `npm run package` shells out to the `zip` command that
ships with macOS and Linux.

Unit tests cover `src/lib/` — filename classification, URL parsing, the
preview decision, the storage layer, and the fetch module. The browser-facing
pieces are covered by `docs/MANUAL-TESTS.md`.

## Documentation

- `docs/superpowers/specs/2026-08-28-drive-html-preview-design.md` — design
- `docs/MANUAL-TESTS.md` — release checklist
- `docs/STORE-LISTING.md` — store submission material
- `docs/PRIVACY.md` — privacy policy
