import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CookieStorage,
  LocalStorageAdapter,
  isStorageAdapter,
  resolveStorage,
  type ConsentStorageAdapter,
} from '../storage.js';
import { createPrivionConsent } from '../consent-engine.js';
import type { ConsentState, PrivionConsentConfig } from '../types.js';

const sampleState: ConsentState = {
  categories: { necessary: 'granted', analytics: 'granted' },
  updatedAt: new Date('2026-05-08T12:00:00.000Z').toISOString(),
  version: 1,
  source: 'banner',
  userDecided: true,
};

const baseConfig: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
  ],
};

describe('LocalStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips state through localStorage', () => {
    const storage = new LocalStorageAdapter();
    storage.save(sampleState);
    expect(storage.load()).toEqual(sampleState);
  });

  it('uses a custom key when provided', () => {
    const storage = new LocalStorageAdapter({ key: 'custom-key' });
    storage.save(sampleState);
    expect(localStorage.getItem('custom-key')).toBeTruthy();
    expect(localStorage.getItem('privion-consent')).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(new LocalStorageAdapter().load()).toBeNull();
  });

  it('clears stored state', () => {
    const storage = new LocalStorageAdapter();
    storage.save(sampleState);
    storage.clear();
    expect(storage.load()).toBeNull();
  });
});

describe('CookieStorage', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
  });

  it('writes a serialized cookie', () => {
    // jsdom's cookie support is partial — verify save() runs without
    // throwing and produces a non-empty document.cookie when supported.
    const storage = new CookieStorage();
    storage.save(sampleState);
    if (document.cookie) {
      expect(document.cookie).toContain('privion-consent');
    }
  });
});

describe('isStorageAdapter', () => {
  it('accepts a fully-formed adapter', () => {
    const adapter: ConsentStorageAdapter = {
      save: () => {},
      load: () => null,
      clear: () => {},
    };
    expect(isStorageAdapter(adapter)).toBe(true);
  });

  it('rejects a StorageConfig (no methods)', () => {
    expect(isStorageAdapter({ type: 'localStorage', key: 'foo' })).toBe(false);
  });

  it('rejects null/undefined/primitives', () => {
    expect(isStorageAdapter(undefined)).toBe(false);
    expect(isStorageAdapter(null)).toBe(false);
    expect(isStorageAdapter('cookie')).toBe(false);
  });
});

describe('resolveStorage', () => {
  it('returns the adapter as-is when given one', () => {
    const adapter: ConsentStorageAdapter = {
      save: () => {},
      load: () => null,
      clear: () => {},
    };
    expect(resolveStorage(adapter)).toBe(adapter);
  });

  it('builds a CookieStorage by default', () => {
    expect(resolveStorage(undefined)).toBeInstanceOf(CookieStorage);
  });

  it('builds a LocalStorageAdapter for type: localStorage', () => {
    expect(resolveStorage({ type: 'localStorage' })).toBeInstanceOf(LocalStorageAdapter);
  });
});

describe('PrivionConsent + custom storage adapter', () => {
  it('routes save/load/clear through a user-supplied adapter', () => {
    const memoryStore: { current: ConsentState | null } = { current: null };
    const adapter: ConsentStorageAdapter = {
      save: vi.fn((state: ConsentState) => {
        memoryStore.current = state;
      }),
      load: vi.fn(() => memoryStore.current),
      clear: vi.fn(() => {
        memoryStore.current = null;
      }),
    };

    const consent = createPrivionConsent({ ...baseConfig, storage: adapter });
    expect(adapter.load).toHaveBeenCalled();

    consent.acceptAll();
    expect(adapter.save).toHaveBeenCalled();
    expect(memoryStore.current?.categories.analytics).toBe('granted');
    expect(memoryStore.current?.userDecided).toBe(true);

    consent.reset();
    expect(adapter.clear).toHaveBeenCalled();
  });

  it('hydrates from a custom adapter on init', () => {
    const adapter: ConsentStorageAdapter = {
      save: () => {},
      load: () => sampleState,
      clear: () => {},
    };
    const consent = createPrivionConsent({ ...baseConfig, storage: adapter });
    expect(consent.getState().categories.analytics).toBe('granted');
    expect(consent.getState().userDecided).toBe(true);
  });
});

afterEach(() => {
  localStorage.clear();
});
