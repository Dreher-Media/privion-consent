# Privion Consent

[![npm](https://img.shields.io/npm/v/@privion-consent/core?label=core)](https://www.npmjs.com/package/@privion-consent/core)
[![npm](https://img.shields.io/npm/v/@privion-consent/dom?label=dom)](https://www.npmjs.com/package/@privion-consent/dom)
[![npm](https://img.shields.io/npm/v/@privion-consent/react?label=react)](https://www.npmjs.com/package/@privion-consent/react)
[![npm](https://img.shields.io/npm/v/@privion-consent/astro?label=astro)](https://www.npmjs.com/package/@privion-consent/astro)
[![license](https://img.shields.io/npm/l/@privion-consent/core)](./LICENSE)

A modern, TypeScript-first consent management library for GDPR / ePrivacy / TTDSG compliance. Ships a framework-agnostic engine plus drop-in bindings for vanilla DOM, React, and Astro — and supports Google Consent Mode v2 out of the box.

## Packages

| Package                                              | What it does                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@privion-consent/core`](./packages/consent-core)   | Framework-agnostic consent engine, storage adapters, GCM v2 mapping, backend sync.                                                                                                                                  |
| [`@privion-consent/dom`](./packages/consent-dom)     | DOM adapter — script blocking via `<script type="privion">`, iframe gating, conditional visibility, banner/preferences UI hooks. Watches the page via `MutationObserver` for late-injected elements.                |
| [`@privion-consent/react`](./packages/consent-react) | React bindings — `<ConsentProvider>`, `<ConsentBanner>`, `<ConsentPreferences>`, `<ConsentErrorBoundary>`, `useConsent` / `useConsentCategory` / `useConsentI18n` hooks, bundled `en` / `de` / `fr` / `es` locales. |
| [`@privion-consent/astro`](./packages/consent-astro) | Astro components and SSR helpers — `<PrivionScript>`, `<ConsentBanner>`, `<ConsentPreferences>`, `<CategoryToggle>`, plus `resolveRegion(headers)` for CDN-aware region detection.                                  |

## Install

```bash
# Pick the binding(s) you need; everything else is pulled in transitively.
npm install @privion-consent/core @privion-consent/dom            # vanilla / generic
npm install @privion-consent/react                                # React
npm install @privion-consent/astro                                # Astro
```

## Quick examples

### Vanilla JavaScript

```javascript
import { createPrivionConsent } from '@privion-consent/core';
import { initPrivionDom } from '@privion-consent/dom';

const consent = createPrivionConsent({
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'marketing', label: 'Marketing' },
  ],
  googleConsentMode: { mode: 'advanced' },
});

initPrivionDom(consent);
```

### React

```jsx
import { ConsentProvider, ConsentBanner, deLocale } from '@privion-consent/react';
import '@privion-consent/dom/styles.css'; // optional default theme

const config = {
  version: 1,
  region: 'DE',
  regionRules: { DE: { mode: 'opt-in' } },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
  ],
};

export function App() {
  return (
    <ConsentProvider config={config} i18n={deLocale}>
      <YourApp />
      <ConsentBanner />
    </ConsentProvider>
  );
}
```

### Astro

```astro
---
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
import { resolveRegion } from '@privion-consent/astro/server';
import '@privion-consent/dom/styles.css';

const region = resolveRegion(Astro.request.headers);
const config = {
  version: 1,
  region,
  regionRules: { DE: { mode: 'opt-in' }, GB: { mode: 'opt-in' } },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics' },
  ],
};
---
<head>
  <PrivionScript config={config} />
</head>
<body>
  <slot />
  <ConsentBanner />
  <ConsentPreferences categories={config.categories} />
</body>
```

See [`docs/astro.md`](./docs/astro.md) for the full Astro walkthrough.

## Documentation

- **[SPECIFICATION.md](./SPECIFICATION.md)** — canonical reference for the data model, attribute schema, event lifecycle, GCM mapping, storage adapters, backend sync, public API surface, and theme tokens.
- **[MIGRATION.md](./MIGRATION.md)** — migration notes between releases.
- **[docs/astro.md](./docs/astro.md)** — long-form Astro setup guide.
- **[examples/](./examples)** — runnable demos for vanilla HTML, Vite + React, and Astro.

## Development

See [AGENTS.md](./AGENTS.md) for the full contributor guide (setup, develop, verify, build, PR process, releases).

Quick reference:

```bash
pnpm install      # install dependencies
pnpm build        # build all packages
pnpm dev          # watch mode
pnpm test         # run tests
pnpm type-check   # type check
pnpm verify       # format:check + type-check + lint + test (run before opening a PR)
```

## Release process

Releases are fully automated via [release-please](https://github.com/googleapis/release-please) in monorepo manifest mode. Conventional-Commit PR titles drive per-package version bumps and `npm publish`. See [AGENTS.md](./AGENTS.md#releases) for details.

## License

[MIT](./LICENSE) © Tobias Laufersweiler
