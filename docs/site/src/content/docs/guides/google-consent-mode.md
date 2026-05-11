---
title: Google Consent Mode v2
description: basic vs advanced, and what the library emits at each stage.
---

Set the mode via `config.googleConsentMode.mode`:

```ts
const consent = createPrivionConsent({
  // ...
  googleConsentMode: { mode: 'advanced' },
});
```

## basic

- The library does **not** announce a `default` payload before the user makes a choice. Host apps in basic mode block Google tags entirely (typically via `<script type="privion">`) until consent, so pre-consent `gtag` chatter is meaningless.
- After the first user decision, `update` is emitted with the full mapping.
- Returning visitors (state hydrated with `userDecided: true`) get a single `update` on init.

## advanced

- The library emits `default` with the current mapping (typically all-denied for new visitors) on engine init. Non-blocked Google tags switch into anonymized cookieless pings.
- After every state change, `update` is emitted.
- Returning visitors get `update` on init (not `default`) so their stored decision propagates without first announcing an all-denied default that contradicts it.

## Mapping

Computed from `ConsentState.categories` plus per-category `googleMapping` overrides:

| Category id   | Default GCM v2 mapping when granted                           |
| ------------- | ------------------------------------------------------------- |
| `analytics`   | `analytics_storage: 'granted'`                                |
| `marketing`   | `ad_storage`, `ad_user_data`, `ad_personalization: 'granted'` |
| anything else | (no default mapping — must be specified per category)         |

Override the default for a specific category:

```ts
categories: [
  {
    id: 'analytics',
    label: 'Analytics',
    googleMapping: { analytics_storage: 'granted', ad_user_data: 'granted' },
  },
];
```

## Transport

The engine tries gtag first (`window.gtag('consent', command, mapping)`), falls back to a dataLayer push (`window.dataLayer.push({ event: 'consent_<command>', ...mapping })`), and finally dispatches a custom DOM event `privion:google-consent-mode` (`detail: { command, mapping, mode }`) so consumers without a Google stack can observe the change.

## Canonical reference

[SPECIFICATION.md §5](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#5-google-consent-mode-v2).
