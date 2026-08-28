---
title: "Spike results: credentialed Drive fetch"
---

# Spike results: credentialed Drive fetch from the service worker

Status: answered in Chrome by the finished extension. Not yet checked in Brave.

## What this spike asked

Whether Google's Drive cookies are sent on a `fetch` initiated by an extension
service worker. A negative answer would have killed fetch path A and forced the
design onto path B, which reads the redirect target from a same-origin request
in the content script.

## Verdict

Path A works in Chrome. The standalone spike in `spike/` was never run on its
own, because the finished extension answered the same question more strongly:
on 2026-08-28 it rendered a real Drive HTML file in Chrome, and it can only do
that by fetching the file's bytes from
`drive.usercontent.google.com` with `credentials: 'include'` and receiving the
file rather than a sign-in page. The extension carries no OAuth scopes and shows
no consent screen, so the user's existing session cookies are the only thing
that could have authorised that request.

Brave is still unverified. Its shields affect cookie behaviour, and cookies are
the whole mechanism here, so the extension may fail there while working in
Chrome. Case 1 of `docs/MANUAL-TESTS.md` covers it.

## Running the spike anyway

The stub extension in `spike/` still works and is worth using to isolate a
cookie problem from the rest of the pipeline, in Brave or in any browser where
previews stop working.

1. Upload a small self-contained HTML file to your Drive. Copy its file ID from
   the URL (`drive.google.com/file/d/<FILE_ID>/view`).
2. Open `chrome://extensions`, enable Developer mode, choose "Load unpacked",
   and select the `spike/` directory.
3. Click the extension's "service worker" link to open its console.
4. Run `await spike('<FILE_ID>')`.

A pass returns `status: 200`, `looksLikeLoginPage: false`, and a `head` holding
the start of your actual HTML file. A failure redirects to an
accounts.google.com login page, returns `401` or `403`, or returns Google's
sign-in form as the body.

Redact the file ID before pasting any verdict object into this file.

## Brave

Date run: `<TO FILL: YYYY-MM-DD>`

Browser version: `<TO FILL>`

Verdict object: `<TO FILL>`

Result: `<TO FILL: PASS or FAIL>`
