---
title: Specification
description: The canonical contract for what every package does and what consumers can rely on.
---

The full specification lives in [SPECIFICATION.md](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md) — it's the contract that every other doc on this site narrates.

## What it covers

1. **Compliance scope** — GDPR Art. 6/7, ePrivacy Art. 5(3), TTDSG §25. What the library _does_ (mechanism) vs what the host app owns (legal determinations).
2. **Data model** — `ConsentStatus`, `ConsentSource`, `ConsentState`, `userDecided`, `PrivionConsentConfig`.
3. **Attribute schema** — every `privion-*` / `[privion-banner]` / `[type="privion"]` attribute the DOM adapter recognizes.
4. **Event lifecycle** — `ready`, `update`, `accept_all`, `reject_all`, `reset` and their ordering.
5. **Google Consent Mode v2** — `basic` vs `advanced` semantics, default mapping table, transport fallback.
6. **Region & defaults** — `region`, `regionRules`, `defaultRegionMode`.
7. **Storage** — built-in adapters, `ConsentStorageAdapter` interface, migration rules.
8. **Backend sync** — payload shape, retry policy, `BackendSyncError`.
9. **Public API surface** — every exported symbol across the four packages.
10. **React-in-Astro** — when to pick which binding inside an Astro project.
11. **Astro support** — `<PrivionScript>`, `.astro` components, `resolveRegion`.
12. **Default styles** — opt-in stylesheet, theme tokens, dark mode.

## Stability

Spec sections that are **stable** in v1.0 won't change in a breaking way until a `2.0` major bump (with a `MIGRATION.md` entry covering the diff).

Sections marked **draft** are still subject to refinement and may change in minor releases. The current spec is fully stable; future sections may be added (e.g. server-side consent log audit format, IAB TCF integration) in draft state before landing.
