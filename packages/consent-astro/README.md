# @privion-consent/astro

Astro components and SSR helpers for [Privion Consent](https://github.com/Dreher-Media/privion-consent). Drop `<PrivionScript>` into your layout's `<head>`, render `<ConsentBanner>` / `<ConsentPreferences>`, resolve the user's region from CDN headers — that's the whole setup.

## Install

```bash
npm install @privion-consent/astro
```

Peer-deps: `astro >=4.0.0`. Pulls `@privion-consent/core` and `@privion-consent/dom` in transitively.

## Quick example

```astro
---
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
import { resolveRegion } from '@privion-consent/astro/server';
import type { PrivionConsentConfig } from '@privion-consent/astro';
import '@privion-consent/dom/styles.css'; // optional default theme

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

## What's inside

- **`<PrivionScript>`** — head-script that boots the engine + DOM adapter from a JSON-serialized config; attaches the instance to `window.__privionConsent`.
- **`<ConsentBanner>` / `<ConsentPreferences>` / `<CategoryToggle>`** — native `.astro` components, no React dependency. Render with `hidden` set so the SSR markup stays dormant; the DOM adapter unhides them on the client according to `state.userDecided`.
- **`resolveRegion(headers)`** — server-side helper reading the user's region from `cf-ipcountry` / `x-vercel-ip-country` / `x-country` / `x-appengine-country` (configurable). Skips Cloudflare sentinels (`XX`, `T1`).
- **`bootPrivion(config)` / `readSerializedConfig(id?)`** — exposed for hosts that bypass `<PrivionScript>` and want to construct the engine themselves (e.g. to pass non-serializable config like custom storage adapters or `onSyncError` callbacks).

## Documentation

- **[docs/astro.md](https://github.com/Dreher-Media/privion-consent/blob/main/docs/astro.md)** — long-form setup guide including region resolution, conditional content, React-vs-Astro decision matrix, event subscription patterns.
- **[SPECIFICATION.md §11](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#11-astro-support)** — reference summary.
- **[examples/astro/](https://github.com/Dreher-Media/privion-consent/tree/main/examples/astro)** — runnable demo.

## License

MIT © Tobias Laufersweiler
