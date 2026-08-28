---
title: "Privacy policy — Drive HTML Preview"
---

# Privacy policy — Drive HTML Preview

Last updated: 2026-08-28

Drive HTML Preview renders HTML files stored in your Google Drive as web pages
instead of showing their source code.

## What the extension accesses

When you open an HTML file in Google Drive, the extension downloads that file's
contents using your browser's existing Google session, and renders it in an
isolated frame in a new page. It requests no OAuth scopes and no Drive API
access, and it never sees your Google credentials.

## What the extension does with it

The file's contents are held in your browser's session storage only long enough
to hand them to the viewer page, and are discarded as soon as the viewer reads
them. They are cleared when you close your browser.

## What the extension does not do

- It does not transmit your files, your file names, or any other data to the
  author of this extension or to any third party.
- It does not contain analytics, telemetry, or tracking of any kind.
- It has no server component, so the extension itself has nowhere to send your
  data. This is a statement about the extension's own code, not about the
  documents it renders — see the next section.
- It does not read, collect, or store your Google credentials.
- It does not access files other than the one you have opened.

## What a document you open may do

The two lists above describe the extension itself. They do not describe the
HTML file you are viewing.

An HTML file can reference scripts, images, stylesheets, or fonts from
third-party servers, and it can send network requests of its own — an analytics
beacon, for example. It can do that in this extension's viewer exactly as it
could in any ordinary browser tab, and the extension does not block it. The
viewer's content security policy permits the rendered document to load
resources over `https:` and to open connections over `https:`.

So: the extension sends nothing anywhere. A document you open may send
something to whoever wrote the document, or to the third parties it references,
and the extension will not stop it. That is the same exposure you would have
opening the file from any other web page. If you do not trust a file's author,
do not preview the file.

The document runs in a sandboxed frame in an opaque origin. It has no access to
`chrome.*` APIs, to extension storage, to your Google cookies, or to your other
Drive files.

## Permissions

- **Storage** — to pass a file's contents from the background script to the
  viewer page, and to remember whether you have turned previewing off.
- **Access to drive.google.com and drive.usercontent.google.com** — to detect
  that you have opened an HTML file, and to download that file's contents.

## Contact

Open an issue on the project's repository.
