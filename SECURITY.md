# Security policy

## Reporting a vulnerability

Report security issues through GitHub's
[security advisory form](https://github.com/filipeaaoliveira/google-drive-html-preview/security/advisories/new).
Please do not open a public issue for anything exploitable.

Include what an attacker can achieve, the steps to reproduce it, and the browser
and version you saw it in. A file that demonstrates the problem helps most.

## What counts as a vulnerability here

This extension renders untrusted HTML. Its whole design rests on keeping that
HTML away from the extension's own privileges, so anything that crosses that
line is a security issue rather than a bug:

- a viewed document reaching `chrome.*` APIs, extension storage, the user's
  cookies, or any Drive file other than the one you opened
- the extension rendering a file other than the one the user opened, since it
  identifies files by reading a DOM that Google controls
- the viewer navigating somewhere the user did not ask for
- a file's contents leaving the browser

## Where the boundary is

A viewed document can load scripts, styles, images and fonts over `https:` and
open its own network connections, because a page that cannot do that is not
being displayed as a page. The extension does not block this, the privacy policy says so, and it is not a
vulnerability. The document runs in a
sandboxed frame in an opaque origin, so it can talk to its own author's servers
and to nothing belonging to you or to the extension.

The extension requests no OAuth scopes and no Drive API access. It reads the
opened file using the Google session already present in the browser.

## Supported versions

The latest release gets fixes. This is a small project with a single
maintainer, so older versions do not receive backports.
