# @privion-consent/core

Framework-agnostic consent engine for [Privion Consent](https://github.com/Dreher-Media/privion-consent).

Implements the consent state machine, persistence (cookie / localStorage / pluggable adapters), Google Consent Mode v2 mapping, regional opt-in/opt-out defaults, schema migrations, and backend sync with retries.

## Install

```bash
npm install @privion-consent/core
```

For most use cases you'll pair this with one of the bindings:

- [`@privion-consent/dom`](https://www.npmjs.com/package/@privion-consent/dom) — vanilla DOM adapter (script blocking, iframe gating, banner/preferences UI hooks).
- [`@privion-consent/react`](https://www.npmjs.com/package/@privion-consent/react) — React provider, hooks, headless components.
- [`@privion-consent/astro`](https://www.npmjs.com/package/@privion-consent/astro) — Astro components and SSR helpers.

## Quick example

```ts
import { createPrivionConsent } from '@privion-consent/core';

const consent = createPrivionConsent({
  version: 1,
  region: 'DE',
  regionRules: { DE: { mode: 'opt-in' }, GB: { mode: 'opt-in' } },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
  ],
  storage: { type: 'localStorage' },
  googleConsentMode: { mode: 'advanced' },
});

consent.on('update', (state) => {
  console.log('consent updated', state);
});

// Banner accept / reject
consent.acceptAll();
consent.rejectAll();

// Per-category — `'preferences'` source flips state.userDecided to true
consent.setCategory('analytics', 'granted', 'preferences');
```

## Documentation

- **[SPECIFICATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md)** — canonical reference for the data model, event lifecycle, GCM mapping, storage adapters, backend sync.
- **[MIGRATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/MIGRATION.md)** — version migration notes.
- **[examples/](https://github.com/Dreher-Media/privion-consent/tree/main/examples)** — runnable demos.

## License

MIT © Tobias Laufersweiler
