# Privion Consent — Specification

This document is the canonical reference for what `@privion-consent/*` does, what it doesn't do, and what consumers can rely on. Code, tests, and types are the implementation; this document is the contract.

Status: **stable as of v1.0**. Breaking changes follow [semver](https://semver.org/) and are documented in [MIGRATION.md](./MIGRATION.md).

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

The `@privion-consent/dom` adapter inspects the page for the following attributes. They are framework-agnostic — Astro, vanilla HTML, server-rendered React, anything — provided the host app does not strip them at build time. The adapter watches the DOM via `MutationObserver`, so elements injected after `initPrivionDom(...)` runs (SPA hydration, async-loaded markup, framework islands) are picked up automatically without a re-init.

`initPrivionDom` returns a `PrivionDomHandle` whose `destroy()` method disconnects every observer, unsubscribes every consent listener, and clears the tracked element maps. Call it from SPA route-change cleanup and test teardown.

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

The library does **not** ship a built-in geo database. Host apps resolve the user's region (typically from `cf-ipcountry`, a GeoIP service, or browser locale) and pass it via `config.region` (an ISO 3166-1 alpha-2 code).

```ts
type RegionMode = 'opt-in' | 'opt-out';

interface PrivionConsentConfig {
  region?: string; // 'DE', 'US', …
  regionRules?: Record<string, { mode: RegionMode }>;
  defaultRegionMode?: RegionMode;
  // …
}
```

Resolution order for the effective mode:

1. `regionRules[region]` (case-insensitive on the key).
2. `defaultRegionMode`.
3. `undefined` — falls through to legacy behavior (categories without `defaultStatus` start as `'unknown'`).

For categories without an explicit `defaultStatus`, the resolved mode picks the fallback:

- `opt-in` → `'unknown'` (banner is shown until the user decides — GDPR / ePrivacy / TTDSG default).
- `opt-out` → `'granted'` (consent assumed).

A per-category `defaultStatus` always wins over the regional fallback, so hosts can pin specific categories regardless of region.

The exported helper `resolveRegionMode(config)` returns the effective mode without instantiating an engine — useful for SSR rendering or pre-resolving the mode in middleware.

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
2. If stored state's `version` is **lower** than `config.version` and `config.migrations` is provided, the engine walks the chain forward (see §7.4).
3. Otherwise, defaults from `config.categories[*].defaultStatus` apply and `userDecided: false`.

### 7.4 Schema migrations

```ts
interface ConsentMigration {
  from: number;
  to: number;
  migrate(old: ConsentState): ConsentState;
}

interface PrivionConsentConfig {
  migrations?: ConsentMigration[];
  // …
}
```

Walks forward from the stored version step-by-step. Each step:

- The matching `from` step receives the previous state and returns the migrated state. The returned `version` MUST equal `to`; otherwise the engine treats the migration as failed and falls back to defaults.
- A missing step (gap in the chain), an exception thrown from `migrate`, or category ids in the result that the current config doesn't declare all cause a fall-back to defaults — the user is re-prompted rather than silently inheriting a broken state.

The walker caps at 100 steps so a malformed chain (circular pair, bad data) cannot wedge the engine.

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
export { PrivionConsent, createPrivionConsent, resolveRegionMode } from '@privion-consent/core';

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
  ConsentMigration,
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  BackendSyncError,
  PrivionConsentConfig,
  RegionMode,
} from '@privion-consent/core';

// DOM bindings
export { initPrivionDom, type PrivionDomHandle } from '@privion-consent/dom';
// Optional default styles (CSS, see §12). Skip the import to keep
// the bundled banner / preferences components headless.
import '@privion-consent/dom/styles.css';

// React bindings
export {
  ConsentProvider,
  ConsentBanner,
  ConsentPreferences,
  ConsentErrorBoundary,
  useConsent,
  useConsentI18n,
  useConsentCategory,
  // i18n
  enLocale,
  deLocale,
  frLocale,
  esLocale,
  mergeI18n,
  type ConsentI18n,
} from '@privion-consent/react';

// Astro bindings (path-based imports for the .astro components)
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

## 11. Astro support

The `@privion-consent/astro` package wraps the engine + DOM adapter for Astro projects with three pieces:

### 11.1 `<PrivionScript>` component

Drop into your layout's `<head>` once. Takes the engine `config` as a prop, serializes it as JSON into a `<script type="application/json">` block, then loads a small bundled script that calls `bootPrivion(config)` to construct the engine and wire the DOM adapter. The engine instance lands on `window.__privionConsent` so other client code can subscribe to events without re-importing the engine.

Callbacks (`onSyncError`, `payloadTransform`, custom storage adapters, region resolvers) cannot survive JSON serialization — host apps that need them should subscribe via `window.__privionConsent` on a separate `is:inline` script and call `consent.on('update', …)` etc.

### 11.2 SSR-rendered components

```astro
import PrivionScript from '@privion-consent/astro/PrivionScript.astro';
import ConsentBanner from '@privion-consent/astro/ConsentBanner.astro';
import ConsentPreferences from '@privion-consent/astro/ConsentPreferences.astro';
```

`<ConsentBanner>` and `<ConsentPreferences>` render server-side with `hidden` set, then the DOM adapter unhides them on the client according to `state.userDecided`. This keeps the SSR markup empty-looking until hydration — no flash of an unwanted banner for returning visitors. Both components accept default-slot overrides if the bundled markup doesn't match your design.

### 11.3 Server-side region resolution

```ts
import { resolveRegion } from '@privion-consent/astro/server';
const region = resolveRegion(Astro.request.headers);
```

Reads the user's region from a configurable list of CDN headers (Cloudflare `cf-ipcountry`, Vercel `x-vercel-ip-country`, Netlify `x-country`, Akamai EdgeScape) — first non-empty, non-sentinel value wins. Pass the resolved region to `<PrivionScript>` via `config.region` and the engine picks the right `regionRules` entry on first paint.

### 11.4 React-in-Astro

If your Astro project already has React island infrastructure (`@astrojs/react`), you can use `@privion-consent/react` directly with `client:only="react"` instead of `@privion-consent/astro`. Native `.astro` components are recommended by default because they ship no React runtime and SSR cleanly without hydration boundaries; reach for the React package only when you need the hooks (`useConsentCategory`, `useConsentI18n`) inside an existing React component tree.

## 12. Default styles (opt-in)

The bundled banner / preferences / toggles components are intentionally headless — they emit attribute hooks (`[privion-banner]`, `[data-privion-banner]`, `[privion-accept-all]`, …) and let the host app supply CSS. For projects that don't want to write their own, `@privion-consent/dom` ships an opt-in stylesheet:

```ts
import '@privion-consent/dom/styles.css';
```

The stylesheet targets both attribute styles (unprefixed `[privion-*]` used by the DOM adapter and Astro components, and `[data-privion-*]` used by the React components) so a single import covers any binding. Skip the import and components stay fully unstyled.

All visual choices are exposed as CSS custom properties so consumers can override them without overriding the stylesheet itself:

| Property                  | Default (light)                | Notes                                          |
| ------------------------- | ------------------------------ | ---------------------------------------------- |
| `--privion-bg`            | `#ffffff`                      | Banner / panel background                      |
| `--privion-fg`            | `#111827`                      | Body text                                      |
| `--privion-muted`         | `#6b7280`                      | Secondary text (descriptions, helper labels)   |
| `--privion-border`        | `#e5e7eb`                      | Borders between toggle rows / panel edges      |
| `--privion-accent`        | `#2563eb`                      | Primary buttons (Accept all, Save preferences) |
| `--privion-accent-fg`     | `#ffffff`                      | Text on primary buttons                        |
| `--privion-radius`        | `0.75rem`                      | Banner / panel corner radius                   |
| `--privion-shadow`        | `0 10px 30px rgb(0 0 0 / 12%)` | Banner / panel drop shadow                     |
| `--privion-z-banner`      | `1000`                         | Banner z-index                                 |
| `--privion-z-preferences` | `1001`                         | Preferences modal z-index                      |
| `--privion-backdrop`      | `rgb(15 23 42 / 50%)`          | Preferences modal backdrop                     |

A dark variant kicks in automatically via `prefers-color-scheme: dark`. To force a theme regardless of OS preference, set `data-privion-theme="dark"` (or `"light"`) on the `<html>` element.

## 10. Out of scope for v1

The following are intentionally **not** part of v1.0 and are tracked for later phases:

- Built-in geolocation. Host apps plug in a region resolver and pass `config.region`.
- IAB TCF (Transparent Consent Framework) integration.
- Server-side consent log storage with audit trails (the host app's backend handles this).
- Cross-domain consent sync (single-origin only in v1).
- Async-first storage adapters with deferred load (the engine constructor consumes storage synchronously).
