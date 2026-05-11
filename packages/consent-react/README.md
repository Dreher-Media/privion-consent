# @privion-consent/react

React bindings for [Privion Consent](https://github.com/Dreher-Media/privion-consent). Provides `<ConsentProvider>`, headless `<ConsentBanner>` / `<ConsentPreferences>` components, hooks (`useConsent`, `useConsentCategory`, `useConsentI18n`), an error boundary, and bundled `en` / `de` / `fr` / `es` locales.

## Install

```bash
npm install @privion-consent/react
```

Peer-deps: `react ^18.0.0`.

## Quick example

```tsx
import {
  ConsentBanner,
  ConsentErrorBoundary,
  ConsentProvider,
  deLocale,
} from '@privion-consent/react';
import '@privion-consent/dom/styles.css'; // optional default theme

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

const { state, consent } = useConsent();
const { status, set } = useConsentCategory('analytics');
const i18n = useConsentI18n();

set('granted', 'preferences'); // 'preferences' source flips state.userDecided
```

## i18n

Bundled locales: `enLocale` (default), `deLocale`, `frLocale`, `esLocale`. Pass a full locale or a partial `Partial<ConsentI18n>` override; missing keys fall back to English. Per-category label / description overrides via `i18n.categories[id]`.

## Documentation

- **[SPECIFICATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md)** — canonical reference.
- **[MIGRATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/MIGRATION.md)** — version migration notes.
- **[examples/vite-react/](https://github.com/Dreher-Media/privion-consent/tree/main/examples/vite-react)** — runnable demo with locale + theme picker.

## License

MIT © Tobias Laufersweiler
