---
title: Regions & i18n
description: Map ISO country codes to opt-in / opt-out defaults; pick a UI locale.
---

## Region-aware defaults

The library doesn't ship a geo database. Pass the resolved region (ISO 3166-1 alpha-2) into the config and provide a `regionRules` table:

```ts
createPrivionConsent({
  version: 1,
  region: 'DE', // resolved from your CDN / GeoIP / browser locale
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
    { id: 'analytics', label: 'Analytics' }, // no defaultStatus — region decides
    { id: 'marketing', label: 'Marketing' },
  ],
});
```

- **`opt-in`** → categories without an explicit `defaultStatus` start as `'unknown'`, forcing the banner.
- **`opt-out`** → those categories start as `'granted'`. Banner still shows for the first visit (until `state.userDecided` flips), but operational decisions can run immediately.

Per-category `defaultStatus` always wins over the regional fallback.

## Resolving the region

In an Astro layout, use the bundled helper:

```astro
---
import { resolveRegion } from '@privion-consent/astro/server';
const region = resolveRegion(Astro.request.headers);
---
```

Reads `cf-ipcountry`, `x-vercel-ip-country`, `x-country`, `x-appengine-country` (first non-empty wins). Skips Cloudflare sentinels (`XX`, `T1`).

For non-Astro setups, do the equivalent in your framework — read the same header(s) on the server, pass into `config.region`.

## React i18n

```tsx
import { ConsentProvider, deLocale, frLocale, esLocale, enLocale } from '@privion-consent/react';

<ConsentProvider config={config} i18n={deLocale}>
  {/* … */}
</ConsentProvider>;
```

Bundled locales: `enLocale` (default), `deLocale`, `frLocale`, `esLocale`. Pass a full locale or a partial override; missing keys fall back to English:

```tsx
<ConsentProvider config={config} i18n={{ acceptAll: 'Yes please' }}>
```

Per-category overrides via `i18n.categories[id]`:

```tsx
i18n: {
  categories: {
    analytics: { label: 'Statistiques', description: '...' },
  },
}
```

For non-React bindings, render your own UI strings — the engine itself is locale-free.

## Canonical reference

[SPECIFICATION.md §6](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#6-region--defaults).
