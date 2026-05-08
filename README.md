# Privion Consent

A modern, TypeScript-based consent management library with GDPR/ePrivacy support, Google Consent Mode v2 integration, and React bindings.

## Packages

- `@privion-consent/core` - Core consent engine
- `@privion-consent/dom` - DOM adapter for scripts, iframes, and visibility
- `@privion-consent/react` - React bindings and components

## Installation

```bash
# Core package
npm install @privion-consent/core

# DOM adapter
npm install @privion-consent/dom

# React bindings
npm install @privion-consent/react
```

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

## Release Process

Releases are fully automated via [release-please](https://github.com/googleapis/release-please) in monorepo manifest mode. Conventional-Commit PR titles drive per-package version bumps and `npm publish`. See [AGENTS.md](./AGENTS.md#releases) for details.

## Usage

### Vanilla JavaScript

```javascript
import { createPrivionConsent } from '@privion-consent/core';
import { initPrivionDom } from '@privion-consent/dom';

const consent = createPrivionConsent({
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
    { id: 'marketing', label: 'Marketing', defaultStatus: 'denied' },
  ],
  googleConsentMode: { mode: 'advanced' },
});

initPrivionDom(consent);
```

### React

```jsx
import { ConsentProvider, ConsentBanner } from '@privion-consent/react';

const config = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
  ],
};

function App() {
  return (
    <ConsentProvider config={config}>
      <YourApp />
      <ConsentBanner />
    </ConsentProvider>
  );
}
```

For more examples, see the specification document.
