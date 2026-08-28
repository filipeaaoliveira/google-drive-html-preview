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
- It has no server component. There is nowhere for your data to be sent.
- It does not read, collect, or store your Google credentials.
- It does not access files other than the one you have opened.

## Permissions

- **Storage** — to pass a file's contents from the background script to the
  viewer page, and to remember whether you have turned previewing off.
- **Access to drive.google.com and drive.usercontent.google.com** — to detect
  that you have opened an HTML file, and to download that file's contents.

## Contact

Open an issue on the project's repository.
