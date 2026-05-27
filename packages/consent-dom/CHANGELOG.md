# Changelog

## [1.0.1](https://github.com/Dreher-Media/privion-consent/compare/consent-dom-v1.0.0...consent-dom-v1.0.1) (2026-05-27)


### Bug Fixes

* **dom:** stage preferences toggles until save instead of committing on change ([#23](https://github.com/Dreher-Media/privion-consent/issues/23)) ([1f53aef](https://github.com/Dreher-Media/privion-consent/commit/1f53aef6ccf9557bb4bc2653e479350a23f0b8e2))

## [1.0.0](https://github.com/Dreher-Media/privion-consent/compare/consent-dom-v0.1.0...consent-dom-v1.0.0) (2026-05-11)


### ⚠ BREAKING CHANGES

* **core:** `ConsentState` now includes a required `userDecided` field. Code that constructs ConsentState manually (e.g. via the `initialState` prop on `ConsentProvider` for SSR hydration) must include it. `setCategory`/`setMany` accept an optional third/second argument respectively for declaring the source of the change.

### Features

* **core:** phase 1 — engine correctness and spec ([#2](https://github.com/Dreher-Media/privion-consent/issues/2)) ([d874627](https://github.com/Dreher-Media/privion-consent/commit/d874627b0367f1f04d471ecd05dab9451bb20ba3))
* **dom:** phase 4 — opt-in default styles + vite-react example ([#9](https://github.com/Dreher-Media/privion-consent/issues/9)) ([c4e4acf](https://github.com/Dreher-Media/privion-consent/commit/c4e4acf84f3ddbbff6a7064d6e82e09ee3584917))
* **dom:** phase 5 — robustness (mutation observer, error boundary, stricter ts) ([#10](https://github.com/Dreher-Media/privion-consent/issues/10)) ([a32f127](https://github.com/Dreher-Media/privion-consent/commit/a32f1271debc005c2451b16775f3c2a995ce72f2))
