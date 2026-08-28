---
layout: home
title: Drive HTML Preview
---

<section class="marquee">
  <h1>Drive shows the source.<br /><span class="marquee__accent">This shows the page.</span></h1>
  <p class="marquee__meta">Chromium extension · Chrome and Brave · MIT</p>
</section>

<hr class="rule-thick" />

<section class="band">
  <p class="lede">
    Open an HTML file in Google Drive and you get a wall of markup. Drive retired
    its own web hosting in 2016 and no setting brings it back, so the fix has to
    run in the browser.
  </p>

  <div class="compare">
    <div class="compare__pane">
      <p class="compare__label">What Drive gives you</p>
<pre class="compare__code"><span class="compare__tag">&lt;!doctype html&gt;</span>
<span class="compare__tag">&lt;html</span> lang="en"<span class="compare__tag">&gt;</span>
  <span class="compare__tag">&lt;style&gt;</span>
    body { font: 16px/1.6 }
    h1   { letter-spacing: -.02em }
  <span class="compare__tag">&lt;/style&gt;</span>
  <span class="compare__tag">&lt;h1&gt;</span>Quarterly report<span class="compare__tag">&lt;/h1&gt;</span>
  <span class="compare__tag">&lt;p&gt;</span>Three routes remain open.<span class="compare__tag">&lt;/p&gt;</span></pre>
    </div>
    <div class="compare__pane compare__render">
      <p class="compare__label">What this gives you</p>
      <h3>Quarterly report</h3>
      <p>Three routes remain open.</p>
      <div class="compare__swatches"><span></span><span></span><span></span></div>
    </div>
  </div>

  <div class="cta-row">
    <a class="btn btn--primary" href="{{ site.repo }}/releases/latest">Download the latest release</a>
    <a class="btn btn--ghost" href="{{ site.repo }}">Read the source</a>
    <span class="cta-note">Unzip, load unpacked, done</span>
  </div>
</section>

<section class="band band--tint">
  <h2>What it asks for</h2>
  <p>
    No OAuth, no consent screen, no Drive API scopes. The extension reads the file
    with the Google session already in your browser, and renders it on your own machine.
  </p>

  <dl class="spec">
    <dt>Permissions</dt>
    <dd><code>storage</code>, plus <code>drive.google.com</code> and <code>drive.usercontent.google.com</code>. Nothing else.</dd>

    <dt>Network</dt>
    <dd>One request, to Drive, for the file you opened. No server, no analytics, no telemetry.</dd>

    <dt>Isolation</dt>
    <dd>Your file runs in a sandboxed frame on an opaque origin, with no access to extension APIs, extension storage, or your cookies.</dd>

    <dt>Size</dt>
    <dd>About 21 KB. No dependencies, no build step.</dd>
  </dl>
</section>

<section class="band">
  <h2>Before you install something that reads your files</h2>

  <div class="faq">
    <details>
      <summary>How does it know which file I opened?</summary>
      <div class="faq__answer"><div>
        <p>
          Drive opens most files in an overlay on top of the folder, which leaves
          both the URL and the page title unchanged. So the file has to be identified
          from Google's own markup, and that markup can be rearranged without notice.
        </p>
        <p>
          Three separate checks have to agree before anything renders: the visible
          dialog has to name an HTML file, one selected row and no others has to carry
          both a Drive file id and that same name, and the filename Drive returns in the
          download response has to match what the page claimed. Any disagreement and
          the extension does nothing, which leaves Drive as it was.
        </p>
      </div></div>
    </details>

    <details>
      <summary>Can it render the wrong file?</summary>
      <div class="faq__answer"><div>
        <p>
          Showing you someone else's document would be worse than showing you nothing, so
          that is the case the checks are built around. The third check is
          the backstop: the file's real name, taken from the HTTP response rather than
          the page, has to match. The extension refuses a file whose identity it cannot verify.
        </p>
      </div></div>
    </details>

    <details>
      <summary>What does it not do?</summary>
      <div class="faq__answer"><div>
        <p>
          Multi-file sites are out of scope. HTML that references sibling Drive files
          for CSS, JavaScript or images will not resolve them. The extension expects a
          self-contained file, with everything inline or loaded from public CDNs.
        </p>
        <p>
          A file served without a character set, or with the wrong one, may render as
          mojibake. A bare <code>/file/d/&lt;id&gt;</code> URL with no trailing segment is not
          recognised. The README has the full list.
        </p>
      </div></div>
    </details>

    <details>
      <summary>Can a page I open send data somewhere?</summary>
      <div class="faq__answer"><div>
        <p>
          Yes, and the privacy policy says so rather than burying it. The extension
          transmits nothing. A document you open can reference scripts, fonts or images
          from third-party servers and make its own requests, as it could in any
          browser tab, and the extension does not block that.
        </p>
        <p>
          It runs in a sandboxed frame, so it can talk to its own author's servers and
          to nothing belonging to you.
          <a href="{{ '/PRIVACY.html' | relative_url }}">Read the full policy</a>.
        </p>
      </div></div>
    </details>

    <details>
      <summary>Does it work in Brave?</summary>
      <div class="faq__answer"><div>
        <p>
          Yes, tested with default shields. Brave matters on its own here: shields affect
          cookies, and the Google session cookie is the only thing authenticating the
          download. There is no OAuth fallback.
        </p>
      </div></div>
    </details>
  </div>

  <div class="cta-row">
    <a class="btn btn--primary" href="{{ site.repo }}/releases/latest">Download</a>
    <a class="btn btn--ghost" href="{{ site.repo }}/blob/main/CHANGELOG.md">Changelog</a>
  </div>
</section>
