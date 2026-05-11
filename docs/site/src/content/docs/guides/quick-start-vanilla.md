---
title: Quick start (vanilla)
description: Wire up the engine and DOM adapter in a plain HTML page.
---

The vanilla setup is two imports plus a config. The DOM adapter handles attributes; you don't manually wire button clicks.

## Minimal example

```html
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="https://unpkg.com/@privion-consent/dom/dist/styles.css" />
  </head>
  <body>
    <!-- Tracking script — blocked until consent -->
    <script
      type="privion"
      privion-category="analytics"
      src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
    ></script>

    <!-- Embedded iframe — blocked until consent -->
    <iframe
      privion-category="marketing"
      privion-src="https://www.youtube.com/embed/..."
      src="about:blank"
    ></iframe>

    <!-- Conditional visibility -->
    <div privion="analytics">Visible only when analytics is granted</div>

    <!-- Banner -->
    <div privion-banner hidden>
      <p>We use cookies and similar technologies to improve your experience.</p>
      <button privion-reject-all>Reject all</button>
      <button privion-open-preferences>Customize</button>
      <button privion-accept-all>Accept all</button>
    </div>

    <!-- Preferences modal -->
    <div privion-preferences hidden>
      <h2>Privacy preferences</h2>
      <label>
        <input type="checkbox" privion-required="necessary" disabled checked />
        Necessary <span>required for the site to function</span>
      </label>
      <label>
        <input type="checkbox" privion-toggle="analytics" />
        Analytics
      </label>
      <button privion-save-preferences>Save preferences</button>
    </div>

    <script type="module">
      import { createPrivionConsent } from '@privion-consent/core';
      import { initPrivionDom } from '@privion-consent/dom';

      const consent = createPrivionConsent({
        version: 1,
        categories: [
          { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'marketing', label: 'Marketing' },
        ],
        storage: { type: 'localStorage' },
        googleConsentMode: { mode: 'advanced' },
      });

      initPrivionDom(consent);

      consent.on('update', (state) => console.log('consent updated', state));
    </script>
  </body>
</html>
```

## What just happened

1. `createPrivionConsent(...)` constructs the engine, hydrates state from `localStorage`, and emits `ready`.
2. `initPrivionDom(consent)` scans the page for tagged elements and subscribes to the engine's events. It returns a `PrivionDomHandle` whose `destroy()` cleans up MutationObservers and event listeners — useful in SPAs.
3. When the user clicks **Accept all**, the engine calls `setMany(...)` with `source: 'banner'` and emits `update` + `accept_all`. `userDecided` flips to `true` and the banner hides.
4. The blocked `<script>` and `<iframe>` activate — the script is cloned as an executable element, the iframe's `src` is swapped from `privion-src`.

## Next steps

- [Data model](/guides/data-model/) — `ConsentState`, `userDecided`, sources.
- [Attribute schema](/reference/attribute-schema/) — every `privion-*` attribute and what it does.
- [Backend sync](/guides/backend-sync/) — POST consent decisions to your server for audit.
