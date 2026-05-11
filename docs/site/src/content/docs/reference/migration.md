---
title: Migration guide
description: Upgrade notes per major version.
---

The canonical migration guide lives in [MIGRATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/MIGRATION.md) — it's mirrored here for searchability.

## 0.x → 1.0

The 0.x series predates the v1.0 hardening pass. If you were on a pre-release 0.x, the breaking changes you need to handle:

- **`ConsentState.userDecided`** is now a required field. Code that constructs `ConsentState` manually (e.g. via the `initialState` prop on `ConsentProvider` for SSR hydration) must include it.
- **`setCategory(id, status)` / `setMany(updates)`** now accept an optional `source` argument. Existing callers continue to work unchanged; pass `'banner'` / `'preferences'` from UI flows so `userDecided` flips correctly.
- **`config.i18n`** moved from `PrivionConsentConfig` to a separate `i18n` prop on `<ConsentProvider>`. Engine-level i18n is gone.
- **Storage** gained a pluggable `ConsentStorageAdapter` interface. The old `ConsentStorage` class is still exported as a deprecated wrapper; new code should use `resolveStorage(config.storage)` or instantiate `CookieStorage` / `LocalStorageAdapter` directly.
- **Google Consent Mode `mode`** is now honored. Previously the mode flag was accepted but ignored; `basic` now skips the pre-consent `default` emit.
- **Backend sync** got a retry policy (3 attempts default) and an `onSyncError` callback. Existing configs without `retries` / `onSyncError` keep the same effective behavior.

See [MIGRATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/MIGRATION.md) for the full breaking-change list with before/after examples.

## Future majors

Each major bump ships a new section in `MIGRATION.md` describing what changed and how to update. Minor and patch releases follow [semver](https://semver.org/) — no breaking changes.
