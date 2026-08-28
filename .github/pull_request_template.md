## What this changes

## Manual verification

The content script, service worker, viewer and sandbox have no automated
coverage. If you touched any of them, say what you checked and where.

- [ ] Opened an HTML file from a folder listing (Drive's overlay)
- [ ] Opened one through a `/file/d/<id>/view` link
- [ ] Opened a PDF, which did not redirect
- [ ] Checked in Chrome
- [ ] Checked in Brave with default shields

Browsers and versions:

## Security

- [ ] The viewer's iframe still has no `allow-same-origin`
- [ ] The sandbox page still renders through `document.write`
- [ ] No new permission in `manifest.json`

If any of those changed, explain why here and make sure `test/harness.test.js`
changed with it.
