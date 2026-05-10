# Migration guide

## 0.1.x → 1.0.0

This is the first stable release. Anyone building against 0.1.x can migrate to 1.0.0 in roughly half an hour — most changes are additive, the breaking ones are mechanical, and the engine semantics that did flip ([§1](#1-userdecided-replaces-statesource-as-the-banner-trigger), [§4](#4-i18n-moves-from-the-engine-config-to-consentprovider)) are improvements you'd have wanted anyway.

After v1.0 we follow [semver](https://semver.org/) strictly: breaking changes mean a major bump and get a new entry in this file. Until then, breaking changes can land in any 0.x release.

If anything below is unclear or your migration hits something not covered, please open an issue.

---

### 1. `userDecided` replaces `state.source` as the banner trigger

The engine used to use `state.source === 'api'` as a proxy for "user has not yet decided." That was fragile — any programmatic `setCategory(...)` call reset `source` to `'api'` and would re-show the banner on the next page view, even after the user had already accepted.

`ConsentState` now carries an explicit `userDecided: boolean` field. Banner visibility is driven solely by it. The `source` field still exists and still records why a particular state change happened, but UI handlers no longer check it directly.

**You probably don't need to do anything** — if you only consume the bundled `<ConsentBanner>` from `@privion-consent/react` or the `[privion-banner]` element wired by `@privion-consent/dom`, both already use the new flag. Two cases need attention:

#### Constructing `ConsentState` manually

If you pass `initialState` to `<ConsentProvider>` for SSR hydration (or build a `ConsentState` from any other source), the field is now required:

```diff
 const initialState: ConsentState = {
   categories: { necessary: 'granted', analytics: 'denied' },
   updatedAt: new Date().toISOString(),
   version: 1,
   source: 'api',
+  userDecided: false,
 };
```

#### Custom banner-show logic

If you wrote your own banner component that decided visibility from `state.source`, switch to `state.userDecided`:

```diff
- const showBanner = state.source === 'api';
+ const showBanner = !state.userDecided;
```

The legacy `state.source === 'api'` check still produces the same result for new visitors, but breaks the moment any host code calls `consent.setCategory(...)` programmatically.

#### Stored state from 0.1.x

Existing localStorage / cookie state from 0.1.x that lacks `userDecided` is migrated automatically on load: `source: 'banner' | 'preferences'` is treated as decided, anything else as undecided. No action needed.

---

### 2. `setCategory` / `setMany` accept an optional `source` argument

Both methods now take an optional final argument declaring why the change is happening:

```ts
consent.setCategory('analytics', 'granted'); // source defaults to 'api'
consent.setCategory('analytics', 'granted', 'preferences');
consent.setMany({ analytics: 'granted', marketing: 'denied' }, 'banner');
```

Passing `'banner'` or `'preferences'` flips `userDecided` to `true`; the default (`'api'`) leaves it untouched so host apps can pre-seed categories from server-fetched data without dismissing the banner.

**Compatibility:** existing single-/double-argument calls keep working unchanged. The argument is purely additive.

`useConsentCategory().set` from `@privion-consent/react` similarly accepts an optional second argument:

```ts
const { status, set } = useConsentCategory('analytics');
set('granted', 'preferences');
```

---

### 3. Storage adapters are now pluggable

The previous `ConsentStorage` class hardcoded a choice between cookie and localStorage. v1.0 splits that into a `ConsentStorageAdapter` interface plus per-backend implementations:

```ts
import {
  CookieStorage, // class
  LocalStorageAdapter, // class
  type ConsentStorageAdapter,
  isStorageAdapter,
  resolveStorage,
} from '@privion-consent/core';
```

`config.storage` accepts either form:

- A built-in selector: `{ type: 'cookie' | 'localStorage', key?, cookieOptions? }` (the existing 0.1.x shape — unchanged).
- A custom `ConsentStorageAdapter` instance for plugging in IndexedDB, server-side stores, React Native AsyncStorage, etc.

```ts
const consent = createPrivionConsent({
  // …
  storage: { type: 'localStorage', key: 'app-consent' }, // works as before
  // OR
  storage: new MyIndexedDbAdapter({ db: 'consent' }), // new in 1.0
});
```

**`ConsentStorage` (the deprecated wrapper):** still exported for back-compat. Calls delegate through `resolveStorage(...)`. New code should pick a specific adapter (`CookieStorage` / `LocalStorageAdapter`) or implement the interface directly. The wrapper will be removed in 2.0.

---

### 4. i18n moves from the engine config to `<ConsentProvider>`

UI strings don't belong in the engine — they vary per render context, not per consent backend. The 0.1.x `PrivionConsentConfig.i18n` field was inert (declared but never read by anything), so this is mostly a cleanup.

```diff
 const consent = createPrivionConsent({
   version: 1,
   categories: [...],
-  i18n: {
-    en: { 'banner.body': 'We use cookies…' },
-    de: { 'banner.body': 'Wir verwenden Cookies…' },
-  },
 });
```

Pass strings to `<ConsentProvider>` instead — either a full bundled locale or a partial override:

```diff
 import {
   ConsentProvider,
+  deLocale,
+  type ConsentI18n,
 } from '@privion-consent/react';

 <ConsentProvider config={consent}
+  i18n={deLocale}
 >
   ...
 </ConsentProvider>
```

Bundled locales: `enLocale` (default), `deLocale`, `frLocale`, `esLocale`. All four are tree-shakeable named exports. A partial override is merged on top of `enLocale`:

```ts
<ConsentProvider config={consent} i18n={{ acceptAll: 'Yes please' }}>
```

Per-category label/description overrides via `i18n.categories[id]` so you can localize without changing what the engine knows about.

For host-built UIs that share the lexicon, the new `useConsentI18n()` hook returns the resolved string table.

**TypeScript users:** the `i18n` field on `PrivionConsentConfig` is gone. Delete the dead config entry; if you weren't using it (the field was inert in 0.1.x) nothing else changes.

---

### 5. `initPrivionDom` returns a `PrivionDomHandle`

Previously the function returned `void` and stashed handlers on `(consent as any)._privionDomHandlers`. v1.0 returns a typed handle:

```diff
- initPrivionDom(consent);
+ const dom = initPrivionDom(consent);
+ // …
+ dom.destroy(); // disconnect MutationObservers, unsubscribe listeners, clear maps
```

**Compatibility:** the legacy stash on the consent instance still happens, so callers ignoring the return value keep working. The new return type is purely additive.

Use `destroy()` from SPA route-change cleanup or test teardown. The DOM adapter watches the page via `MutationObserver` so late-injected privion elements activate without re-init — that observer needs explicit teardown to avoid leaks across engine instances.

---

### 6. Google Consent Mode `mode: 'basic' | 'advanced'` is now honored

The `mode` field was wired through `googleConsentMode.mode` in 0.1.x but ignored — both modes behaved identically. v1.0 makes it real:

- `basic`: skip the pre-consent `default` emit. Host apps in basic mode block Google tags entirely until consent (typically via `<script type="privion">`), so pre-consent gtag chatter is meaningless.
- `advanced`: emit `default` immediately so any non-blocked Google tags switch into anonymized cookieless pings until consent.

**You may need to flip your config:** if you were on `mode: 'advanced'` (the recommended 0.1.x default in our examples) and your tags **don't** load before consent — i.e. you block them all via `<script type="privion">` — switch to `'basic'`. Otherwise the engine emits an `update` your unloaded tags can't observe.

---

### 7. Region defaults — opt-in vs opt-out

`config.defaultRegionMode` was declared in 0.1.x but inert. v1.0 makes it real and adds two companions:

```ts
{
  region?: string;                                // ISO 3166-1 alpha-2, e.g. 'DE'
  regionRules?: Record<string, { mode: 'opt-in' | 'opt-out' }>;
  defaultRegionMode?: 'opt-in' | 'opt-out';
}
```

Resolution:

1. `regionRules[region]` (case-insensitive on the key) wins.
2. Otherwise `defaultRegionMode`.
3. Otherwise the legacy fallback (`'unknown'` for categories without an explicit `defaultStatus` — same as 0.1.x).

The library still **does not** ship a geo database. Host apps resolve the user's region from a CDN header, GeoIP service, or browser locale and pass it via `config.region`. The `@privion-consent/astro` package ships a `resolveRegion(headers)` helper for the Astro middleware case.

**No action required** unless you want to opt into the new behavior. Existing configs without these fields keep their 0.1.x defaults.

---

### 8. Backend sync hardening — retries, `onSyncError`, `payloadTransform`

The 0.1.x `BackendSyncConfig` only carried `endpoint` / `method` / `headers` / `includeIp` / `includeUserAgent`. Every failure was silently swallowed with a `console.warn`. v1.0 adds:

```ts
{
  retries?: number;                                  // default 3
  retryBaseDelayMs?: number;                         // default 200
  payloadTransform?: (state: ConsentState) => unknown;
  onSyncError?: (error: BackendSyncError) => void;
}
```

Retry policy: 5xx and network failures retry with exponential backoff (200, 400, 800 ms by default); 4xx is treated as permanent and not retried; every failure (including each retried attempt) calls `onSyncError` with a structured payload (`{ endpoint, attempt, totalAttempts, cause: 'http' | 'network', status?, statusText?, error? }`).

The default request payload now includes `source` and `userDecided` alongside `categories / version / updatedAt / userAgent?` so server-side audit logs can record what triggered each sync. If you've built a backend that strictly validates the payload schema, expect the two new fields. Override with `payloadTransform` if you need the old shape:

```ts
backendSync: {
  endpoint: '/api/consent',
  payloadTransform: (state) => ({
    categories: state.categories,
    version: state.version,
    updatedAt: state.updatedAt,
  }),
};
```

**No action required** unless you're tightening error reporting (highly recommended) or need the legacy payload shape.

---

### 9. Schema migrations

`config.migrations` is new in v1.0 — it lets you preserve consent across `version` bumps when you rename / split / merge categories:

```ts
{
  migrations: [
    {
      from: 1,
      to: 2,
      migrate: (old) => ({
        ...old,
        version: 2,
        categories: {
          necessary: old.categories.necessary,
          stats: old.categories.analytics, // renamed
        },
      }),
    },
  ];
}
```

Without the chain (or with a buggy chain — wrong return version, orphaned ids, thrown migrate), the engine falls back to defaults and re-prompts. See [SPECIFICATION.md §7.4](./SPECIFICATION.md#74-schema-migrations).

**No action required** unless you bump `version`. In 0.1.x a version bump silently discarded stored consent.

---

### 10. New: `@privion-consent/astro`

Net-new package. If you're using Astro, see [docs/astro.md](./docs/astro.md) for the setup walkthrough. Three pieces:

- `<PrivionScript>` — head-script component that boots the engine from a JSON-serialized config.
- `<ConsentBanner>` / `<ConsentPreferences>` / `<CategoryToggle>` — native `.astro` components with no React dependency.
- `resolveRegion(headers)` — server-side region helper.

**No migration needed** — additive new package.

---

### 11. New: opt-in default styles

`@privion-consent/dom/styles.css` is a new opt-in stylesheet that any binding can import for a working baseline (themable via CSS custom properties, dark-mode via `prefers-color-scheme` + `data-privion-theme` override). The bundled components stay headless if you don't import it, so 0.1.x consumers see no visual change.

```ts
// Add this to opt in:
import '@privion-consent/dom/styles.css';
```

See [SPECIFICATION.md §12](./SPECIFICATION.md#12-default-styles-opt-in) for the theme-token table.

---

### 12. New: `<ConsentErrorBoundary>` (React)

Net-new export from `@privion-consent/react`. Wraps the consent subtree so a thrown error inside it (e.g. from a buggy `onSyncError` callback) doesn't unmount the rest of the host app:

```tsx
<ConsentErrorBoundary onError={Sentry.captureException}>
  <ConsentProvider config={config}>
    <App />
    <ConsentBanner />
  </ConsentProvider>
</ConsentErrorBoundary>
```

**No migration needed** — additive.

---

## Quick checklist

The minimum diff for a 0.1.x → 1.0.0 upgrade with no new features:

- [ ] If you construct `ConsentState` manually, add `userDecided: false`.
- [ ] If your custom banner reads `state.source` for visibility, switch to `state.userDecided`.
- [ ] If your engine config has an `i18n` key, delete it (it was inert) and pass to `<ConsentProvider i18n={…}>` instead.
- [ ] If your Google Consent Mode setup blocks all tags pre-consent, set `mode: 'basic'`.
- [ ] If your backend strictly validates the consent payload, expect `source` and `userDecided` fields (or use `payloadTransform` to keep the old shape).

Everything else is additive.
