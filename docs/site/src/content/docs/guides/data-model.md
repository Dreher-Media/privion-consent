---
title: Data model
description: ConsentStatus, ConsentSource, userDecided, and how they fit together.
---

## ConsentStatus

```ts
type ConsentStatus = 'granted' | 'denied' | 'unknown';
```

`unknown` is "user has not been asked" — distinct from `denied` (active rejection). Categories in `unknown` should be treated as **not consented** for any operational decision (don't load tracking, etc.) but should surface the banner so the user can decide.

## ConsentSource

```ts
type ConsentSource = 'banner' | 'preferences' | 'api';
```

Records why the most recent state change happened. UI handlers pass `'banner'` for Accept/Reject all and `'preferences'` for Save preferences. Programmatic `setCategory(...)` / `setMany(...)` calls default to `'api'`.

## ConsentState

```ts
interface ConsentState {
  categories: Record<string, ConsentStatus>;
  updatedAt: string; // ISO 8601
  version: number; // matches PrivionConsentConfig.version
  source: ConsentSource;
  userDecided: boolean; // user has actively chosen
}
```

**`userDecided` is the canonical signal for "should we still show the banner?".** It is set to `true` only when source is `'banner'` or `'preferences'`. Programmatic API calls don't flip it, so the banner stays visible until the user makes a real choice. This matters when a host app pre-seeds categories from server-side data — those updates use `source: 'api'` and shouldn't dismiss the banner.

## Persistence

State is JSON-serialized to one of the configured stores. The default is a single cookie at `privion-consent`. The version field is checked on load:

- **Stored version matches config version, categories valid** → state hydrated.
- **Stored version differs** → defaults applied. The `config.migrations` array can preserve consent across renames; see [Storage](/guides/storage/).

## Canonical reference

For the full data model — including `BackendSyncError`, region types, GCM mapping, all the `PrivionConsentConfig` fields — see [SPECIFICATION.md §2](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#2-data-model).
