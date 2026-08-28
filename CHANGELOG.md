# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-08-28

### Fixed

- A file opened while previewing was switched off stayed unopenable for the rest
  of that page's life, even after switching previewing back on. The extension
  recorded a file as tried before it knew the outcome; it now only remembers
  decisions that cannot change, such as the file not being HTML.
- The wait before the same file can be previewed again is 2 seconds rather than
  5. It exists to stop a restored overlay redirecting in a loop, and 5 seconds
  was long enough to refuse a deliberate reopen.
- Filenames are no longer written to the service worker console.

### Changed

- The Drive file id pattern had five definitions in two different shapes, so the
  same id could be accepted on one path and rejected on another. There is one
  definition now.
- Records of attempted files are capped, so a long Drive session cannot grow
  them without bound.

## [1.0.0] - 2026-08-28

First release.

### Added

- Renders HTML files stored in Google Drive as web pages instead of source code.
- Triggers on Drive's in-folder overlay, where the URL and the page title both
  stay on the folder, and on `/file/d/<id>/view` URLs.
- Downloads files with the browser's existing Google session. No OAuth, no
  consent screen, no Drive API scopes.
- Runs the viewed document in a manifest-declared sandbox page, in an opaque
  origin with no access to `chrome.*` APIs, extension storage or cookies.
- Viewer toolbar with View source, Reload, and Back to Drive. Back to Drive
  returns to the folder the file was opened from.
- Popup toggle to turn previewing off.
- Detects a Google sign-in page returned as HTTP 200 and declines rather than
  rendering the login form as the user's document.
- Confirms the filename Drive returns in `Content-Disposition` against the name
  read from the page before rendering, so a misread of Drive's DOM cannot
  display the wrong file.

[1.0.1]: https://github.com/filipeaaoliveira/google-drive-html-preview/releases/tag/v1.0.1
[1.0.0]: https://github.com/filipeaaoliveira/google-drive-html-preview/releases/tag/v1.0.0
