---
title: Quick start (Astro)
description: Native Astro components with SSR region resolution.
---

```astro
---
// src/layouts/Layout.astro
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
import { resolveRegion } from '@privion-consent/astro/server';
import type { PrivionConsentConfig } from '@privion-consent/astro';
import '@privion-consent/dom/styles.css';

const region = resolveRegion(Astro.request.headers);

const config: PrivionConsentConfig = {
  version: 1,
  region,
  regionRules: { DE: { mode: 'opt-in' }, GB: { mode: 'opt-in' } },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
  ],
  storage: { type: 'localStorage' },
};
---

<!doctype html>
<html lang="en">
  <head>
    <PrivionScript config={config} />
  </head>
  <body>
    <slot />
    <ConsentBanner />
    <ConsentPreferences categories={config.categories} />
  </body>
</html>
```

That's the whole setup.

## How it works

- **`<PrivionScript>`** serializes the config as JSON into a `<script type="application/json">` block, then a small bundled script reads it and boots the engine + DOM adapter via `bootPrivion`. The instance lands on `window.__privionConsent`.
- **`<ConsentBanner>` / `<ConsentPreferences>` / `<CategoryToggle>`** are native `.astro` components — no React runtime, no hydration boundaries. They render server-side with `hidden` set; the DOM adapter unhides them on the client according to `state.userDecided`.
- **`resolveRegion(Astro.request.headers)`** reads `cf-ipcountry` / `x-vercel-ip-country` / `x-country` / `x-appengine-country` (first non-empty wins). Skips Cloudflare sentinels (`XX`, `T1`) automatically.

## SSR vs static

`Astro.request.headers` only carries CDN headers when the page is rendered on-demand. For fully static builds, `resolveRegion` returns `undefined` and the engine falls back to `defaultRegionMode`. Switch to `output: 'server'` or `output: 'hybrid'` for per-request region resolution.

## Subscribing from your own scripts

```astro
<script>
  function whenReady(cb) {
    if (window.__privionConsent) return cb(window.__privionConsent);
    queueMicrotask(() => whenReady(cb));
  }
  whenReady((consent) => {
    consent.on('update', (state) => console.log('consent updated', state));
  });
</script>
```

For non-serializable config (custom storage adapters, `onSyncError`, `payloadTransform`), skip `<PrivionScript>` and construct the engine yourself inside a regular Astro `<script>` — see the [Astro guide on GitHub](https://github.com/Dreher-Media/privion-consent/blob/main/docs/astro.md) for the full pattern.

## Next steps

- [Regions & i18n](/guides/regions-i18n/) — how CDN headers map to `regionRules`.
- [Attribute schema](/reference/attribute-schema/) — what the DOM adapter wires under the hood.
