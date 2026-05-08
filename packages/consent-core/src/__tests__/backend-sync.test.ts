import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrivionConsent } from '../consent-engine.js';
import type { BackendSyncError, ConsentState, PrivionConsentConfig } from '../types.js';

const baseConfig: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
  ],
};

function okResponse(): Response {
  return new Response(null, { status: 204 });
}

function statusResponse(status: number, statusText = ''): Response {
  return new Response(null, { status, statusText });
}

describe('Backend sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs to the configured endpoint after a state change', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(okResponse());

    const consent = createPrivionConsent({
      ...baseConfig,
      backendSync: { endpoint: 'https://api.example/consent', retries: 0 },
    });

    consent.acceptAll();
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.example/consent');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({
      categories: { necessary: 'granted', analytics: 'granted' },
      source: 'banner',
      userDecided: true,
    });
  });

  it('does not retry on a 4xx response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(statusResponse(400));
    const onSyncError = vi.fn<[BackendSyncError], void>();

    const consent = createPrivionConsent({
      ...baseConfig,
      backendSync: {
        endpoint: 'https://api.example/consent',
        retries: 5,
        retryBaseDelayMs: 0,
        onSyncError,
      },
    });

    consent.acceptAll();
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(onSyncError).toHaveBeenCalledTimes(1);
    expect(onSyncError.mock.calls[0][0]).toMatchObject({
      cause: 'http',
      status: 400,
      attempt: 1,
    });
  });

  it('retries 5xx responses up to `retries + 1` total attempts', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(statusResponse(503));
    const onSyncError = vi.fn<[BackendSyncError], void>();

    const consent = createPrivionConsent({
      ...baseConfig,
      backendSync: {
        endpoint: 'https://api.example/consent',
        retries: 2,
        retryBaseDelayMs: 0,
        onSyncError,
      },
    });

    consent.acceptAll();
    await flushPromises();

    expect(globalThis.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(onSyncError).toHaveBeenCalledTimes(3);
    expect(onSyncError.mock.calls.map((c) => c[0].attempt)).toEqual([1, 2, 3]);
    expect(onSyncError.mock.calls[0][0].cause).toBe('http');
  });

  it('retries network failures', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(okResponse());

    const onSyncError = vi.fn<[BackendSyncError], void>();

    const consent = createPrivionConsent({
      ...baseConfig,
      backendSync: {
        endpoint: 'https://api.example/consent',
        retries: 2,
        retryBaseDelayMs: 0,
        onSyncError,
      },
    });

    consent.acceptAll();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2); // first fails, second succeeds
    expect(onSyncError).toHaveBeenCalledTimes(1);
    expect(onSyncError.mock.calls[0][0]).toMatchObject({
      cause: 'network',
      attempt: 1,
    });
  });

  it('uses payloadTransform to shape the request body', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(okResponse());
    const transform = vi.fn((state: ConsentState) => ({ wrapped: { state } }));

    const consent = createPrivionConsent({
      ...baseConfig,
      backendSync: {
        endpoint: 'https://api.example/consent',
        retries: 0,
        payloadTransform: transform,
      },
    });

    consent.acceptAll();
    await flushPromises();

    expect(transform).toHaveBeenCalledTimes(1);
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(JSON.parse(init.body)).toEqual({
      wrapped: { state: expect.objectContaining({ source: 'banner', userDecided: true }) },
    });
  });
});

/**
 * Yield long enough for the fire-and-forget syncToBackend chain to
 * settle. The chain awaits multiple `setTimeout(_, 0)` "sleep" calls
 * back-to-back across retries, so a single 0-tick flush isn't enough.
 * 50ms of real time is plenty for any number of zero-delay sleeps to
 * drain.
 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}
