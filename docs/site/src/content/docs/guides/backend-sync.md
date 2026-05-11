---
title: Backend sync
description: POSTing consent decisions to your server with retries and structured errors.
---

```ts
createPrivionConsent({
  // ...
  backendSync: {
    endpoint: '/api/consent',
    method: 'POST',
    retries: 3,
    retryBaseDelayMs: 200,
    includeUserAgent: true,
    onSyncError: (err) => Sentry.captureException(err),
    payloadTransform: (state) => ({ data: state, ts: Date.now() }),
  },
});
```

## Default payload

```json
{
  "categories": { "necessary": "granted", "analytics": "granted" },
  "version": 1,
  "updatedAt": "2026-05-08T12:00:00.000Z",
  "source": "banner",
  "userDecided": true,
  "userAgent": "…" // only when includeUserAgent is true
}
```

Override with `payloadTransform` for backends expecting a different envelope.

## Retry policy

| Failure       | Behavior                                                    |
| ------------- | ----------------------------------------------------------- |
| Network error | retry with exponential backoff (200, 400, 800 ms — default) |
| HTTP 5xx      | retry with exponential backoff                              |
| HTTP 4xx      | no retry — treated as permanent client error                |
| HTTP 2xx      | success                                                     |

Total attempts = `retries + 1`. Every failed attempt (including each retry) calls `onSyncError` with a `BackendSyncError`:

```ts
interface BackendSyncError {
  endpoint: string;
  attempt: number;
  totalAttempts: number;
  cause: 'network' | 'http';
  status?: number;
  statusText?: string;
  error?: unknown;
}
```

The library never throws on sync failures — it only reports through the callback.

## Canonical reference

[SPECIFICATION.md §8](https://github.com/Dreher-Media/privion-consent/blob/main/SPECIFICATION.md#8-backend-sync).
