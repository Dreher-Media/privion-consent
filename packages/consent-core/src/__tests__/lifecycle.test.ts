import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrivionConsent } from '../consent-engine.js';
import type { ConsentState, PrivionConsentConfig } from '../types.js';
import type { ConsentStorageAdapter } from '../storage.js';

const KEY = 'privion-consent';
const DAY = 24 * 60 * 60 * 1000;

const config: PrivionConsentConfig = {
  version: 1,
  storage: { type: 'localStorage' },
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'marketing', label: 'Marketing', defaultStatus: 'denied' },
  ],
};

function stored(): ConsentState | null {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as ConsentState) : null;
}

function seed(state: Partial<ConsentState>): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      categories: { necessary: 'granted', marketing: 'granted' },
      updatedAt: new Date().toISOString(),
      version: 1,
      source: 'banner',
      userDecided: true,
      ...state,
    }),
  );
}

describe('consent lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saving preferences', () => {
    it('records a decision even when the save changes nothing', () => {
      const consent = createPrivionConsent(config);
      consent.setMany({ marketing: 'denied' }, 'preferences');
      expect(consent.getState().userDecided).toBe(true);
      expect(stored()?.userDecided).toBe(true);
    });

    it('does not mark an unchanged programmatic setMany as a decision', () => {
      const consent = createPrivionConsent(config);
      consent.setMany({ marketing: 'denied' });
      expect(consent.getState().userDecided).toBe(false);
      expect(stored()).toBeNull();
    });

    it('stamps decidedAt on user decisions only', () => {
      const consent = createPrivionConsent(config);
      consent.setCategory('marketing', 'granted');
      expect(consent.getState().decidedAt).toBeUndefined();
      consent.rejectAll();
      expect(consent.getState().decidedAt).toBe(consent.getState().updatedAt);
    });
  });

  describe('expiry (consentMaxAgeDays)', () => {
    it('keeps a decision younger than the default 365 days', () => {
      seed({ decidedAt: new Date(Date.now() - 200 * DAY).toISOString() });
      expect(createPrivionConsent(config).getState().userDecided).toBe(true);
    });

    it('discards a decision older than the default 365 days', () => {
      seed({ decidedAt: new Date(Date.now() - 400 * DAY).toISOString() });
      const state = createPrivionConsent(config).getState();
      expect(state.userDecided).toBe(false);
      expect(state.categories.marketing).toBe('denied');
    });

    it('falls back to updatedAt for states stored before decidedAt existed', () => {
      seed({ updatedAt: new Date(Date.now() - 400 * DAY).toISOString() });
      expect(createPrivionConsent(config).getState().userDecided).toBe(false);
    });

    it('honors a custom consentMaxAgeDays', () => {
      seed({ decidedAt: new Date(Date.now() - 200 * DAY).toISOString() });
      const state = createPrivionConsent({ ...config, consentMaxAgeDays: 180 }).getState();
      expect(state.userDecided).toBe(false);
    });

    it('never expires with consentMaxAgeDays: Infinity', () => {
      seed({ decidedAt: new Date(Date.now() - 4000 * DAY).toISOString() });
      const state = createPrivionConsent({ ...config, consentMaxAgeDays: Infinity }).getState();
      expect(state.userDecided).toBe(true);
    });
  });

  describe('categories added after the decision', () => {
    const extended: PrivionConsentConfig = {
      ...config,
      categories: [...config.categories, { id: 'analytics', label: 'Analytics' }],
    };

    it('asks again and keeps the earlier answers', () => {
      seed({});
      const state = createPrivionConsent(extended).getState();
      expect(state.userDecided).toBe(false);
      expect(state.categories.marketing).toBe('granted');
      expect(state.categories.analytics).toBe('unknown');
    });

    it('does not re-ask when only a required category was added', () => {
      seed({});
      const state = createPrivionConsent({
        ...config,
        categories: [...config.categories, { id: 'security', label: 'Security', required: true }],
      }).getState();
      expect(state.userDecided).toBe(true);
      expect(state.categories.security).toBe('granted');
    });

    it('forces required categories to granted whatever was stored', () => {
      seed({ categories: { necessary: 'denied', marketing: 'granted' } });
      expect(createPrivionConsent(config).getState().categories.necessary).toBe('granted');
    });
  });

  describe('malformed stored state', () => {
    const bad: Array<[string, unknown]> = [
      ['no categories', { version: 1, updatedAt: '2026-01-01T00:00:00Z' }],
      ['categories is an array', { version: 1, updatedAt: 'x', categories: [] }],
      ['unknown status', { version: 1, updatedAt: 'x', categories: { marketing: 'yes' } }],
      ['version is a string', { version: '1', updatedAt: 'x', categories: {} }],
      ['null', null],
      ['a number', 42],
    ];

    for (const [name, value] of bad) {
      it(`falls back to defaults instead of throwing: ${name}`, () => {
        localStorage.setItem(KEY, JSON.stringify(value));
        const consent = createPrivionConsent(config);
        expect(consent.getState().userDecided).toBe(false);
        expect(consent.getState().categories.marketing).toBe('denied');
      });
    }

    it('survives a custom adapter that returns garbage or throws', () => {
      const garbage: ConsentStorageAdapter = {
        load: () => ({ nope: true }) as unknown as ConsentState,
        save: () => {},
        clear: () => {},
      };
      expect(() => createPrivionConsent({ ...config, storage: garbage })).not.toThrow();

      const throwing: ConsentStorageAdapter = {
        load: () => {
          throw new Error('boom');
        },
        save: () => {},
        clear: () => {},
      };
      expect(() => createPrivionConsent({ ...config, storage: throwing })).not.toThrow();
    });
  });

  describe('state isolation', () => {
    it('getState returns a copy that cannot change the engine', () => {
      const consent = createPrivionConsent(config);
      consent.getState().categories.marketing = 'granted';
      expect(consent.getState().categories.marketing).toBe('denied');
    });

    it('hands each event a fresh object that handlers cannot mutate', () => {
      const consent = createPrivionConsent(config);
      const seen: ConsentState[] = [];
      consent.on('update', (state) => {
        seen.push(state);
        state.categories.marketing = 'unknown';
      });
      consent.setCategory('marketing', 'granted');
      consent.setCategory('marketing', 'denied');
      expect(seen[0]).not.toBe(seen[1]);
      expect(seen[0]!.categories).not.toBe(seen[1]!.categories);
      expect(consent.getState().categories.marketing).toBe('denied');
    });
  });
});
