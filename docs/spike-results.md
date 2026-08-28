# Spike results: credentialed Drive fetch from the service worker

**Status: NOT YET RUN — no verdict has been recorded.**

This file is a template. Every field below marked `<TO FILL>` is a placeholder.
Nothing here has been observed in a browser yet. Do not treat this document as
evidence of a PASS until a human has run the spike and replaced the
placeholders with real console output.

Date run: `<TO FILL: YYYY-MM-DD>`

## What this spike answers

Whether Google's Drive cookies are sent on a `fetch` initiated by an extension
service worker. If they are not, fetch path A is dead and the design pivots to
path B before any viewer code is written.

## How to run it

1. Upload a small self-contained HTML file to your Drive. Copy its file ID from
   the URL (`drive.google.com/file/d/<FILE_ID>/view`).
2. Open `chrome://extensions`, enable Developer mode, "Load unpacked", select
   the `spike/` directory.
3. Click the extension's "service worker" link to open its console.
4. Run `await spike('<FILE_ID>')`.
5. Repeat all of the above in Brave, with default shields.

Expected on PASS: `status: 200`, `looksLikeLoginPage: false`, and `head`
containing the beginning of your actual HTML file.

Expected on FAIL: a redirect to an accounts.google.com login page, a `401`/`403`,
or an HTML body that is Google's sign-in form rather than your file.

Redact the file ID when pasting the verdict object below.

## Chrome

- Browser version: `<TO FILL>`
- Verdict object as logged:

```json
<TO FILL: paste the object logged by spike(), with the file ID redacted>
```

- Result: `<TO FILL: PASS or FAIL>`
- Notes: `<TO FILL, or "none">`

## Brave

- Browser version: `<TO FILL>`
- Shields setting used: `<TO FILL: default, unless stated otherwise>`
- Verdict object as logged:

```json
<TO FILL: paste the object logged by spike(), with the file ID redacted>
```

- Result: `<TO FILL: PASS or FAIL>`
- Notes: `<TO FILL, or "none">`

## Decision

A Chrome PASS with a Brave FAIL still means path A is insufficient — both must
pass for path A to be confirmed. If the verdict is FAIL, stop and report to the
human partner rather than silently switching paths; path B changes Task 6's
shape and the human should confirm the pivot.

Write exactly one of:

- `DECISION: fetch path A confirmed`
- `DECISION: fetch path A rejected, proceeding with path B`

DECISION:
