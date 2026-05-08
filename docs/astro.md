# Privion Consent in Astro

Drop-in Astro support for the same engine the React and vanilla bindings use. This guide covers the typical setup; the reference for what each piece does is [SPECIFICATION.md §11](../SPECIFICATION.md#11-astro-support).

## Install

```bash
pnpm add @privion-consent/astro
```

The package depends on `@privion-consent/core` and `@privion-consent/dom` — pnpm will pull them in automatically.

## Wire it into your layout

```astro
---
// src/layouts/Layout.astro
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
import { resolveRegion } from '@privion-consent/astro/server';
import type { PrivionConsentConfig } from '@privion-consent/astro';

const region = resolveRegion(Astro.request.headers);

const consentConfig: PrivionConsentConfig = {
  version: 1,
  region,
  regionRules: {
    DE: { mode: 'opt-in' },
    AT: { mode: 'opt-in' },
    FR: { mode: 'opt-in' },
    GB: { mode: 'opt-in' },
    CH: { mode: 'opt-in' },
  },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
  ],
  storage: { type: 'localStorage' },
  googleConsentMode: { mode: 'advanced' },
};
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <PrivionScript config={consentConfig} />
  </head>
  <body>
    <slot />
    <ConsentBanner />
    <ConsentPreferences categories={consentConfig.categories} />
  </body>
</html>
```

That's the whole setup. The banner shows on first visit (or for returning visitors who never decided), the preferences modal opens when the user clicks Customize, and the engine state survives reloads via `localStorage`.

### Default styles (optional)

The components are headless by default. For a working baseline that you can theme via CSS custom properties, import the bundled stylesheet anywhere in your CSS chain (typically the layout):

```astro
---
import '@privion-consent/dom/styles.css';
---
```

See [SPECIFICATION.md §12](../SPECIFICATION.md#12-default-styles-opt-in) for the list of theme tokens and dark-mode behavior. Skip the import to keep the components fully unstyled and provide your own CSS.

## Region resolution

`resolveRegion(Astro.request.headers)` reads the country code from CDN headers in this order:

1. `cf-ipcountry` (Cloudflare)
2. `x-vercel-ip-country` (Vercel)
3. `x-country` (Netlify)
4. `x-appengine-country` (App Engine)

The first non-empty value wins. Cloudflare sentinels (`XX`, `T1`) are skipped automatically. Pass `{ headers: [...] }` for a custom order or `{ ignoreValues: [...] }` to skip your own sentinels.

`Astro.request.headers` only carries CDN headers when the page is rendered on-demand (`output: 'server'` or `output: 'hybrid'` with the page marked dynamic). For fully static builds you'll need to either:

- **Skip region resolution** and pin a `defaultRegionMode` in the config; or
- **Switch to SSR** (e.g. with `@astrojs/node`, `@astrojs/cloudflare`, etc.) so headers are available per request.

## Conditional content

The DOM adapter handles `[privion]` / `[type="privion"]` / `[privion-src]` attributes the same way it does in vanilla pages. Inside Astro:

```astro
<!-- Show only when analytics consent is granted -->
<div privion="analytics">
  <!-- e.g. embedded analytics iframe -->
</div>

<!-- Block a script until consent -->
<script type="privion" privion-category="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXX"
></script>

<!-- Block an iframe until consent -->
<iframe
  privion-category="marketing"
  privion-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  src="about:blank"
></iframe>
```

Astro's bundler doesn't touch `<script type="privion">` blocks because they aren't recognized as JavaScript MIME types — that's the whole point. The adapter clones them into a real `<script>` element when consent flips to granted.

## React-in-Astro: when to use which

If you already have React islands in your Astro project (you've installed `@astrojs/react` and use `client:*` directives), you can use `@privion-consent/react` directly:

```astro
---
import { ConsentProvider, ConsentBanner } from '@privion-consent/react';
const config = { /* … */ };
---
<ConsentProvider client:only="react" config={config}>
  <ConsentBanner />
</ConsentProvider>
```

When to pick which:

| Use case                                                 | Recommendation               |
| -------------------------------------------------------- | ---------------------------- |
| New Astro project, no React infrastructure               | `@privion-consent/astro`     |
| Existing React islands, want hooks like `useConsentI18n` | `@privion-consent/react`     |
| Mostly static, marketing-style site                      | `@privion-consent/astro`     |
| App-shell with heavy client-side interactivity           | either; React if you have it |

The native Astro components ship zero React runtime and SSR cleanly. The React components add hooks at the cost of a hydration boundary.

## Subscribing to events from your own scripts

`bootPrivion` (called by `<PrivionScript>`) attaches the engine to `window.__privionConsent`. From any other client script you can subscribe:

```astro
<script>
  // Wait until __privionConsent is attached. The simplest way is a
  // small polyfill since PrivionScript and your script may bundle
  // separately and resolve in arbitrary order.
  function whenReady(cb) {
    if (window.__privionConsent) return cb(window.__privionConsent);
    queueMicrotask(() => whenReady(cb));
  }

  whenReady((consent) => {
    consent.on('update', (state) => {
      console.log('consent updated', state);
    });
  });
</script>
```

For features that can't be JSON-serialized into the config (custom storage adapters, `onSyncError`, `payloadTransform`, region resolvers), construct the engine yourself in a regular Astro `<script>` and skip `<PrivionScript>`:

```astro
<script>
  import { createPrivionConsent } from '@privion-consent/core';
  import { initPrivionDom } from '@privion-consent/dom';

  const consent = createPrivionConsent({
    version: 1,
    categories: [/* … */],
    backendSync: {
      endpoint: '/api/consent',
      onSyncError: (err) => Sentry.captureException(err),
      payloadTransform: (state) => ({ data: state, ts: Date.now() }),
    },
  });
  initPrivionDom(consent);
  window.__privionConsent = consent;
</script>
```

## Worked example

[`examples/astro/`](../examples/astro/) is a runnable Astro project with the integration set up end-to-end (region rules, conditional visibility blocks, reset button). From the repo root:

```bash
pnpm install
pnpm --filter @privion-consent/example-astro dev
```
