---
title: Public API
description: Every exported symbol across the four packages.
---

## `@privion-consent/core`

```ts
// Engine
export { PrivionConsent, createPrivionConsent, resolveRegionMode } from '@privion-consent/core';

// Storage
export {
  ConsentStorageAdapter, // interface
  CookieStorage,
  LocalStorageAdapter,
  isStorageAdapter,
  resolveStorage,
  ConsentStorage, // deprecated wrapper, kept for back-compat
} from '@privion-consent/core';

// Google Consent Mode
export { computeGoogleConsentMode, syncGoogleConsentMode } from '@privion-consent/core';

// Types
export type {
  ConsentStatus,
  ConsentSource,
  ConsentState,
  ConsentEvent,
  ConsentCategoryConfig,
  ConsentMigration,
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  BackendSyncError,
  PrivionConsentConfig,
  RegionMode,
} from '@privion-consent/core';
```

## `@privion-consent/dom`

```ts
export { initPrivionDom, type PrivionDomHandle } from '@privion-consent/dom';
import '@privion-consent/dom/styles.css'; // optional default theme
```

## `@privion-consent/react`

```ts
export {
  // Components
  ConsentProvider,
  ConsentBanner,
  ConsentPreferences,
  ConsentErrorBoundary,
  // Hooks
  useConsent,
  useConsentCategory,
  useConsentI18n,
  // i18n
  enLocale,
  deLocale,
  frLocale,
  esLocale,
  mergeI18n,
  type ConsentI18n,
} from '@privion-consent/react';
```

## `@privion-consent/astro`

```ts
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
import CategoryToggle from '@privion-consent/astro/CategoryToggle.astro';

export {
  resolveRegion,
  DEFAULT_REGION_HEADERS,
  DEFAULT_IGNORED_REGION_VALUES,
  type ResolveRegionOptions,
} from '@privion-consent/astro/server';

export { bootPrivion, readSerializedConfig } from '@privion-consent/astro/boot';
```

Types from `@privion-consent/core` are re-exported by `@privion-consent/astro` so you don't need both as direct deps.

## Stability

Everything listed here is part of the v1.0 public surface. Breaking changes follow [semver](https://semver.org/) and are documented in [MIGRATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/MIGRATION.md).

## Canonical reference

[SPECIFICATION.md §9](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#9-public-api-surface).
