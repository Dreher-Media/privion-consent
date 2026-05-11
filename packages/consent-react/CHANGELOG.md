# Changelog

## [1.0.0](https://github.com/Dreher-Media/privion-consent/compare/consent-react-v0.1.0...consent-react-v1.0.0) (2026-05-11)


### ⚠ BREAKING CHANGES

* **react:** removes `i18n?: Record<string, Record<string, string>>` from PrivionConsentConfig in @privion-consent/core. The field was inert in 0.1.x, so existing code that set it without reading it back keeps working — but TypeScript users will need to delete the dead config entry. Replacement is the new `i18n` prop on ConsentProvider in @privion-consent/react.
* **core:** `ConsentState` now includes a required `userDecided` field. Code that constructs ConsentState manually (e.g. via the `initialState` prop on `ConsentProvider` for SSR hydration) must include it. `setCategory`/`setMany` accept an optional third/second argument respectively for declaring the source of the change.

### Features

* **core:** phase 1 — engine correctness and spec ([#2](https://github.com/Dreher-Media/privion-consent/issues/2)) ([d874627](https://github.com/Dreher-Media/privion-consent/commit/d874627b0367f1f04d471ecd05dab9451bb20ba3))
* **dom:** phase 5 — robustness (mutation observer, error boundary, stricter ts) ([#10](https://github.com/Dreher-Media/privion-consent/issues/10)) ([a32f127](https://github.com/Dreher-Media/privion-consent/commit/a32f1271debc005c2451b16775f3c2a995ce72f2))
* **react:** phase 2 — region defaults, i18n, migrations ([#6](https://github.com/Dreher-Media/privion-consent/issues/6)) ([609b23b](https://github.com/Dreher-Media/privion-consent/commit/609b23b31dea235a5597449560a8235e0965fe6d))
