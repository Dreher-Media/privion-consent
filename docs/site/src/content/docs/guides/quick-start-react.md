---
title: Quick start (React)
description: Provider, hooks, and headless components in a React 18+ app.
---

```tsx
import {
  ConsentBanner,
  ConsentErrorBoundary,
  ConsentProvider,
  deLocale,
} from '@privion-consent/react';
import '@privion-consent/dom/styles.css';

const config = {
  version: 1,
  region: 'DE',
  regionRules: { DE: { mode: 'opt-in' }, GB: { mode: 'opt-in' } },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
  ],
  storage: { type: 'localStorage' },
  googleConsentMode: { mode: 'advanced' },
};

export function App() {
  return (
    <ConsentErrorBoundary>
      <ConsentProvider config={config} i18n={deLocale}>
        <YourApp />
        <ConsentBanner />
      </ConsentProvider>
    </ConsentErrorBoundary>
  );
}
```

## Hooks

```tsx
import { useConsent, useConsentCategory, useConsentI18n } from '@privion-consent/react';

function AnalyticsToggle() {
  const { status, set } = useConsentCategory('analytics');
  const i18n = useConsentI18n();

  return (
    <button onClick={() => set(status === 'granted' ? 'denied' : 'granted', 'preferences')}>
      {i18n.acceptAll}
    </button>
  );
}
```

The `'preferences'` source argument tells the engine this is a real user decision — `state.userDecided` flips to `true` and the banner hides. Omit it (or pass `'api'`) for programmatic flips that should leave `userDecided` alone.

## i18n

Bundled locales: `enLocale` (default), `deLocale`, `frLocale`, `esLocale`. Pass a full locale or a partial override; missing keys fall back to English:

```tsx
<ConsentProvider config={config} i18n={{ acceptAll: 'Yes please' }}>
  ...
</ConsentProvider>
```

Per-category labels and descriptions can be overridden via `i18n.categories[id]`.

## Error boundary

`<ConsentErrorBoundary>` accepts a `fallback` (React node OR a function receiving the captured `Error`) and an `onError(error, info)` callback matching React's `componentDidCatch` signature — Sentry / Bugsnag / your-own-reporter drops in directly.

## Next steps

- [Regions & i18n](/guides/regions-i18n/) — `regionRules` + locale picker.
- [Public API](/reference/api/) — every exported symbol with types.
