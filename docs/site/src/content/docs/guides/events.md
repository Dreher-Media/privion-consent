---
title: Event lifecycle
description: ready, update, accept_all, reject_all, reset — when they fire and in what order.
---

```text
                          ┌─── update ←─── setCategory / setMany
                          │
 construct ──→  ready ────┤
                          │
                          ├── accept_all  (also fires update)
                          ├── reject_all  (also fires update)
                          └── reset       (does NOT fire update)
```

- **`ready`** fires once per engine instance, synchronously inside the constructor.
- **`update`** fires on every `setCategory` / `setMany` that actually changed state, plus inside `acceptAll` / `rejectAll`.
- **`accept_all` / `reject_all`** fire _after_ `update`, with the same final state. Listeners that need both kinds of signal can subscribe to `update` and key off `state.source` (`'banner'`).
- **`reset`** clears storage and re-initializes. It fires `reset`; it does _not_ fire `update`.

## Subscribing

```ts
const unsubscribe = consent.on('update', (state) => {
  console.log('consent changed', state);
});

// Later:
unsubscribe();
```

`on(...)` returns the unsubscribe function. Handlers run synchronously in registration order. Errors thrown from a handler are caught by the engine and reported via `console.error` so one bad listener can't break another.

## Source semantics

The emitted `state.source` reflects the value at emit time, not after — the engine no longer mutates `state.source` _after_ emitting (the 0.x release had this bug). Listeners can rely on `source` matching the intent of the change.

## Canonical reference

[SPECIFICATION.md §4](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#4-event-lifecycle).
