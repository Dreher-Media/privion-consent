# Changelog

## [1.3.0](https://github.com/Dreher-Media/privion-consent/compare/consent-astro-v1.2.0...consent-astro-v1.3.0) (2026-09-29)


### Features

* accept Astro 6 and 7 in the @privion-consent/astro peer range ([#56](https://github.com/Dreher-Media/privion-consent/issues/56)) ([544710a](https://github.com/Dreher-Media/privion-consent/commit/544710ae28d31c509d963965772d51c7be477333))
* make stored-consent hydration observable without polling ([#44](https://github.com/Dreher-Media/privion-consent/issues/44)) ([605ea06](https://github.com/Dreher-Media/privion-consent/commit/605ea06716ccf6c62a017a0b2fc9bfa4c3325491))


### Bug Fixes

* render the consent preferences modal as a single card ([#43](https://github.com/Dreher-Media/privion-consent/issues/43)) ([c075040](https://github.com/Dreher-Media/privion-consent/commit/c07504031fe9e4a5355b4134d4240cf2a4032d86))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @privion-consent/core bumped to 1.1.0
    * @privion-consent/dom bumped to 1.0.2

## [1.2.0](https://github.com/Dreher-Media/privion-consent/compare/consent-astro-v1.1.0...consent-astro-v1.2.0) (2026-05-27)

> [!NOTE]
> The minor version bump is cosmetic — there are no new astro features in
> this release. release-please raced between two release PRs (#24 for 1.1.1
> and #26 for 1.2.0) after [#23](https://github.com/Dreher-Media/privion-consent/pull/23)
> merged and incorrectly re-attributed the 1.0.0 and 1.1.0 feature commits to
> a new release range. Version 1.1.1 was never tagged or published to npm;
> 1.2.0 supersedes it. The only actual change in 1.2.0 vs 1.1.0 is the
> workspace dependency bump below.

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @privion-consent/dom bumped to 1.0.1

## [1.1.0](https://github.com/Dreher-Media/privion-consent/compare/consent-astro-v1.0.0...consent-astro-v1.1.0) (2026-05-11)


### Features

* **astro:** support astro 5 alongside astro 4 ([#13](https://github.com/Dreher-Media/privion-consent/issues/13)) ([ec188e7](https://github.com/Dreher-Media/privion-consent/commit/ec188e79306d1283fc48cd11bfbb38774ed151d4))

## 1.0.0 (2026-05-11)


### Features

* **astro:** phase 3 — new @privion-consent/astro package ([#7](https://github.com/Dreher-Media/privion-consent/issues/7)) ([9f43cdc](https://github.com/Dreher-Media/privion-consent/commit/9f43cdc76c620fa078827821e038b8ef277f6ea1))
