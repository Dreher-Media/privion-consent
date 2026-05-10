# @privion-consent/dom

DOM adapter for [Privion Consent](https://github.com/Dreher-Media/privion-consent). Wires the consent engine to the page via attribute hooks — gates scripts, swaps iframe sources, toggles element visibility, and binds banner/preferences buttons. Watches the DOM via `MutationObserver` so late-injected elements activate without re-init.

## Install

```bash
npm install @privion-consent/core @privion-consent/dom
```

## Quick example

```html
<!-- Block tracking scripts until consent -->
<script
  type="privion"
  privion-category="analytics"
  src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
></script>

<!-- Block iframes until consent -->
<iframe
  privion-category="marketing"
  privion-src="https://www.youtube.com/embed/..."
  src="about:blank"
></iframe>

<!-- Conditional visibility -->
<div privion="analytics">Visible only when analytics granted</div>
<div privion="!marketing">Visible only when marketing NOT granted</div>

<!-- Banner / preferences UI hooks -->
<div privion-banner hidden>
  <p>We use cookies…</p>
  <button privion-reject-all>Reject all</button>
  <button privion-accept-all>Accept all</button>
  <button privion-open-preferences>Customize</button>
</div>
```

```ts
import { createPrivionConsent } from '@privion-consent/core';
import { initPrivionDom } from '@privion-consent/dom';

const consent = createPrivionConsent({
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
  ],
});

const dom = initPrivionDom(consent);

// On SPA route teardown, dom.destroy() to disconnect MutationObservers
// and unsubscribe consent listeners.
```

## Default styles (optional)

```ts
import '@privion-consent/dom/styles.css';
```

Themable via CSS custom properties (`--privion-bg`, `--privion-fg`, `--privion-accent`, …). Honors `prefers-color-scheme`; manual override via `<html data-privion-theme="dark">`. Components stay headless if you skip the import.

## Documentation

- **[SPECIFICATION.md §3](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#3-attribute-schema-dom-adapter)** — full attribute schema reference.
- **[SPECIFICATION.md §12](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#12-default-styles-opt-in)** — theme tokens.
- **[examples/vanilla.html](https://github.com/Dreher-Media/privion-consent/blob/main/examples/vanilla.html)** — runnable demo.

## License

MIT © Tobias Laufersweiler
