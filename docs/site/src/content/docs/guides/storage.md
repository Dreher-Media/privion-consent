---
title: Storage adapters
description: Built-in cookie / localStorage backends and how to plug a custom one.
---

## Built-ins

```ts
// Cookie (default — survives across subdomains when you set `domain`)
createPrivionConsent({
  // ...
  storage: {
    type: 'cookie',
    key: 'privion-consent',
    cookieOptions: { domain: '.example.com', maxAgeDays: 365, secure: true, sameSite: 'Lax' },
  },
});

// localStorage
createPrivionConsent({
  // ...
  storage: { type: 'localStorage', key: 'privion-consent' },
});
```

Cookies are the default because they're visible to server-rendered code (useful for SSR consent gating) and survive across subdomains when `domain` is configured.

## Custom adapter

```ts
import type { ConsentStorageAdapter, ConsentState } from '@privion-consent/core';

class MyAdapter implements ConsentStorageAdapter {
  save(state: ConsentState): void {
    /* write somewhere */
  }
  load(): ConsentState | null {
    return null;
  }
  clear(): void {
    /* … */
  }
}

createPrivionConsent({
  // ...
  storage: new MyAdapter(),
});
```

The interface is synchronous in v1 because the engine constructor needs the persisted state to make the first banner-show decision. Wrappers around async backends (IndexedDB, AsyncStorage, …) should buffer state in memory and flush asynchronously inside `save`.

## Schema migrations

Bumping `config.version` invalidates stored consent unless a migration is provided:

```ts
createPrivionConsent({
  version: 2,
  migrations: [
    {
      from: 1,
      to: 2,
      migrate: (old) => ({
        ...old,
        version: 2,
        categories: {
          necessary: old.categories.necessary ?? 'granted',
          // analytics renamed to stats
          stats: old.categories.analytics ?? 'denied',
          ads: 'denied',
        },
      }),
    },
  ],
  // ...
});
```

Migrations chain forward through gaps: a state at version 1 in a config at version 3 will run `1→2` then `2→3` if both migrations are registered.

## Canonical reference

[SPECIFICATION.md §7](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#7-storage).
