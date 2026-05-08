# Privion Consent — Specification

This document is the canonical reference for what `@privion-consent/*` does, what it doesn't do, and what consumers can rely on. Code, tests, and types are the implementation; this document is the contract.

Status: **draft, working towards v1.0**. Subject to change until the v1.0 release; after that, breaking changes follow [semver](https://semver.org/) and are documented in `MIGRATION.md`.

## 1. Compliance scope

Privion Consent is a client-side consent-management library aimed at sites and apps subject to:

- **GDPR** (EU 2016/679), Articles 6 & 7 — lawful basis and the requirements for valid consent.
- **ePrivacy Directive** (2002/58/EC), Article 5(3) — the "cookie consent" rule for storing or accessing information on a user's device.
- **TTDSG** §25 (Germany) — the German implementation of Article 5(3); relevant for the DE market because it tightens enforcement.

The library provides the **mechanism** (state model, persistence, script gating, UI hooks) for collecting, storing, and propagating consent. It does **not** make legal determinations. The host app is responsible for:

- Defining which categories are required vs optional and what defaults apply per region (see §6).
- Wording the banner / preferences UI.
- Deciding what counts as "consent" in their jurisdiction.
- Logging consent for audit purposes (see §8 backend sync).
- Geolocation / region detection (the library accepts a region; it does not infer one).

The library **does not** ship a built-in geo database or legal-text bundle. Both are decisions the host app must own.

## 2. Data model

### 2.1 Consent statuses

```ts
type ConsentStatus = 'granted' | 'denied' | 'unknown';
```

`unknown` is the "user has not been asked yet" state — distinct from `denied` (an active rejection). A category in `unknown` should be treated as **not consented** for any operational decision (do not load tracking scripts, etc.) but should still surface the banner so the user can decide.

### 2.2 Source of a state change

```ts
type ConsentSource = 'banner' | 'preferences' | 'api';
```

Records why the most recent state change happened. UI handlers pass `'banner'` when the user clicks "Accept all" / "Reject all" and `'preferences'` when they save the preferences modal. Programmatic `setCategory(...)` / `setMany(...)` calls default to `'api'` and do not flip the user-decided flag (see §2.3).

### 2.3 ConsentState

```ts
interface ConsentState {
  categories: Record<string, ConsentStatus>;
  updatedAt: string; // ISO 8601 timestamp
  version: number; // matches PrivionConsentConfig.version
  source: ConsentSource; // why the most recent change happened
  userDecided: boolean; // user has actively chosen via banner/preferences
}
```

`userDecided` is the canonical signal for "should we still show the banner?". It is set to `true` only when the source is `'banner'` or `'preferences'`. Programmatic API calls (e.g. a host app pre-seeding a category from server-side data) do **not** flip it, so the banner stays visible for a real user interaction.

### 2.4 Configuration

```ts
interface PrivionConsentConfig {
  version: number;
  categories: ConsentCategoryConfig[];
  defaultRegionMode?: 'opt-in' | 'opt-out'; // see §6
  storage?: StorageConfig | ConsentStorageAdapter; // see §7
  i18n?: Record<string, Record<string, string>>;
  googleConsentMode?: { mode: 'basic' | 'advanced' }; // see §5
  backendSync?: BackendSyncConfig; // see §8
}
```

`version` is a host-controlled integer that invalidates stored consent when the category configuration changes meaningfully (e.g. a category was renamed, split, or removed). Bumping it forces all users back through the banner unless a migration is provided.

## 3. Attribute schema (DOM adapter)

The `@privion-consent/dom` adapter inspects the page for the following attributes. They are framework-agnostic — Astro, vanilla HTML, server-rendered React, anything — provided the host app does not strip them at build time.

### 3.1 Script gating

```html
<script type="privion" privion-category="analytics" src="…"></script>
```

- `type="privion"` makes the script non-executable until consent. Browsers will not run a script whose type is not a known JavaScript MIME.
- `privion-category="analytics,marketing"` (comma- or space-separated) lists the categories that must be granted before activation.
- When the categories are granted, the adapter creates a _new_ `<script>` element copying `src` (or inline `textContent`), `async`, `defer`, `nonce`, and `crossOrigin`, and inserts it right after the original. The original is left in place but stays inert.
- Activation is one-shot per script element. Toggling the category back to `denied` does not unload an already-activated script — that's a host-app concern (typically a page reload).
- `categoryMatchMode` defaults to `'any'` (any one category in the list grants); `'all'` requires all listed categories.

### 3.2 Iframe gating

```html
<iframe privion-category="marketing" privion-src="https://…" src="about:blank"></iframe>
```

- Render the iframe with `src="about:blank"` so it loads nothing pre-consent.
- `privion-src` carries the real URL.
- On activation, the adapter writes `iframe.src = realSrc`. Activation is one-shot.

### 3.3 Conditional visibility

```html
<div privion="analytics">visible if analytics granted</div>
<div privion="!marketing">visible if marketing NOT granted</div>
<div privion="analytics,!marketing">visible if both</div>
```

The expression is comma- or space-separated tokens. A bare token requires that category to be `granted`; `!category` requires the category to **not** be `granted`. All positive tokens must match AND all negative tokens must match. The original `style.display` is restored when the element becomes visible.

### 3.4 UI hooks

```html
<div privion-banner>…</div>
<div privion-preferences hidden>…</div>

<button privion-accept-all>Accept all</button>
<button privion-reject-all>Reject all</button>
<button privion-open-preferences>Customize</button>
<button privion-save-preferences>Save</button>

<input type="checkbox" privion-toggle="analytics" />
<input type="checkbox" privion-required="necessary" disabled checked />
```

- `[privion-banner]` is shown iff `state.userDecided === false`.
- `[privion-preferences]` is initially hidden; clicking `[privion-open-preferences]` un-hides it.
- `[privion-accept-all]` / `[privion-reject-all]` call the engine's `acceptAll()` / `rejectAll()` and hide both banner and preferences.
- `[privion-save-preferences]` collects all `[privion-toggle]` checkboxes and calls `setMany(updates, 'preferences')`.
- `[privion-required]` checkboxes are auto-disabled and force-checked.

## 4. Event lifecycle

```text
                            ┌─── update ←─── setCategory / setMany
                            │
   construct ──→  ready ────┤
                            │
                            ├── accept_all  (also fires update)
                            ├── reject_all  (also fires update)
                            └── reset       (does NOT fire update)
```

- `ready` fires once per engine instance, synchronously inside the constructor.
- `update` fires on every `setCategory` / `setMany` that actually changed state, plus inside `acceptAll` / `rejectAll`.
- `accept_all` and `reject_all` fire **after** `update`, with the same final state. Listeners that need both kinds of signal can subscribe to `update` and key off `state.source` (`'banner'`).
- `reset` clears storage and re-initializes. It fires `reset`; it does not fire `update`.
- All event handlers receive a snapshot of `ConsentState`. Errors thrown from handlers are caught by the engine and `console.error`'d so one bad listener cannot block another.

## 5. Google Consent Mode v2

Two modes, set via `config.googleConsentMode.mode`:

### 5.1 `basic`

- The library does **not** announce a `default` payload before the user makes a choice. The host app blocks Google tags entirely (typically via `<script type="privion">`) until consent.
- After the first decision, `update` is emitted with the full mapping.
- A returning visitor whose state is hydrated from storage with `userDecided: true` gets a single `update` on engine init, propagating their stored decision to gtag/dataLayer.

### 5.2 `advanced`

- The library emits `default` with the current mapping (typically all-denied for new visitors) on engine init. This lets non-blocked Google tags switch into anonymized cookieless pings until consent.
- After every state change, `update` is emitted.

### 5.3 Mapping rules

The mapping is computed from `ConsentState.categories` plus per-category `googleMapping` overrides:

| Category id   | Default GCM v2 mapping when granted                           |
| ------------- | ------------------------------------------------------------- |
| `analytics`   | `analytics_storage: 'granted'`                                |
| `marketing`   | `ad_storage`, `ad_user_data`, `ad_personalization: 'granted'` |
| anything else | (no default mapping — must be specified per category)         |

The mapping starts with all four GCM v2 fields set to `denied` and only flips a field to `granted` when a granted category maps to it. Per-category `googleMapping` (set in `ConsentCategoryConfig.googleMapping`) overrides the defaults.

### 5.4 Transport

The engine tries gtag first (`window.gtag('consent', command, mapping)`), falls back to a dataLayer push (`window.dataLayer.push({ event: 'consent_<command>', …mapping })`), and finally dispatches a custom DOM event `privion:google-consent-mode` (`detail: { command, mapping, mode }`) so consumers without a Google stack can observe the change.

## 6. Region & defaults

`config.defaultRegionMode` (`'opt-in' | 'opt-out'`) is reserved for Phase 2 of the v1.0 roadmap. In v0.x the field is accepted but inert; the engine builds initial state from per-category `defaultStatus`. Phase 2 will add `regionRules` and a `RegionResolver` so the host app can plug in geolocation (Cloudflare `cf-ipcountry`, GeoIP service, browser locale, …) and have `unknown` defaults selected automatically per region.

## 7. Storage

### 7.1 Built-in adapters

`config.storage` accepts a `StorageConfig`:

```ts
interface StorageConfig {
  key?: string; // default 'privion-consent'
  type?: 'cookie' | 'localStorage'; // default 'cookie'
  cookieOptions?: { path?; domain?; maxAgeDays?; secure?; sameSite? };
}
```

Or directly a `ConsentStorageAdapter` instance (see §7.2). Cookies are the default because they survive across subdomains when you set a `domain` and are visible to server-rendered code (useful for SSR consent gating).

### 7.2 Custom adapters

```ts
interface ConsentStorageAdapter {
  save(state: ConsentState): void;
  load(): ConsentState | null;
  clear(): void;
}
```

The interface is synchronous in v1 because the engine constructor needs the persisted state to make the first banner-show decision. Adapters wrapping async backends (IndexedDB, AsyncStorage, …) should buffer the state in memory and flush asynchronously inside `save`. Async-first adapters with deferred load are out of scope for v1.

### 7.3 Versioning

Stored state is keyed by `config.version`. On engine construction:

1. If stored state's `version` matches and all stored category ids exist in the current config, the state is hydrated (with a one-time migration to fill in `userDecided` from the legacy `source` field if missing).
2. Otherwise, defaults from `config.categories[*].defaultStatus` apply and `userDecided: false`.

Phase 2 will add `config.migrations` for preserving consent across category renames.

## 8. Backend sync

Optional. When `config.backendSync` is set, every state change `POST`s (or `PUT`s) the consent state to the configured endpoint.

### 8.1 Configuration

```ts
interface BackendSyncConfig {
  endpoint: string;
  method?: 'POST' | 'PUT'; // default 'POST'
  headers?: Record<string, string>;
  includeIp?: boolean;
  includeUserAgent?: boolean;
  retries?: number; // default 3
  retryBaseDelayMs?: number; // default 200
  payloadTransform?: (state: ConsentState) => unknown;
  onSyncError?: (error: BackendSyncError) => void;
}
```

### 8.2 Default payload

```json
{
  "categories": { "necessary": "granted", "analytics": "granted" },
  "version": 1,
  "updatedAt": "2026-05-08T12:00:00.000Z",
  "source": "banner",
  "userDecided": true,
  "userAgent": "…" // present only when includeUserAgent is true
}
```

Override with `payloadTransform` for backends that expect a different envelope.

### 8.3 Retry policy

| Failure       | Behavior                                          |
| ------------- | ------------------------------------------------- |
| Network error | retry with exponential backoff (200, 400, 800 ms) |
| HTTP 5xx      | retry with exponential backoff                    |
| HTTP 4xx      | no retry — treated as permanent client error      |
| HTTP 2xx      | success                                           |

Total attempts = `retries + 1`. Every failed attempt (including each retry) calls `onSyncError` with a `BackendSyncError` describing what went wrong. The library never throws on sync failures — it only reports through the callback.

## 9. Public API surface

What you can import and rely on (everything else is internal):

```ts
// Engine
export { PrivionConsent, createPrivionConsent } from '@privion-consent/core';

// Storage
export {
  ConsentStorageAdapter, // interface
  CookieStorage, // class
  LocalStorageAdapter, // class
  isStorageAdapter, // type guard
  resolveStorage, // factory
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
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  BackendSyncError,
  PrivionConsentConfig,
} from '@privion-consent/core';

// DOM bindings
export { initPrivionDom } from '@privion-consent/dom';

// React bindings
export {
  ConsentProvider,
  ConsentBanner,
  ConsentPreferences,
  useConsent,
  useConsentCategory,
} from '@privion-consent/react';
```

## 10. Out of scope for v1

The following are intentionally **not** part of v1.0 and are tracked for later phases:

- Built-in geolocation. Host apps plug in a region resolver.
- IAB TCF (Transparent Consent Framework) integration.
- Multi-language UI strings out of the box (Phase 2 adds an i18n layer for the React components).
- Server-side consent log storage with audit trails (the host app's backend handles this).
- Cross-domain consent sync (single-origin only in v1).
- Automatic re-prompting after `version` bumps (Phase 2 adds migrations).
