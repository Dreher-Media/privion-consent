import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrivionConsent } from '../consent-engine.js';
import type { ConsentMigration, ConsentState, PrivionConsentConfig } from '../types.js';

const v3Categories: PrivionConsentConfig['categories'] = [
  { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
  { id: 'stats', label: 'Stats', defaultStatus: 'denied' },
  { id: 'ads', label: 'Ads', defaultStatus: 'denied' },
];

function seed(state: Partial<ConsentState> & Pick<ConsentState, 'categories' | 'version'>): void {
  localStorage.setItem(
    'privion-consent',
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      source: 'banner',
      userDecided: true,
      ...state,
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('config.migrations', () => {
  it('runs a single 1 → 2 migration', () => {
    seed({ version: 1, categories: { necessary: 'granted', analytics: 'granted' } });

    const migrate = vi.fn(
      (old: ConsentState): ConsentState => ({
        ...old,
        version: 2,
        categories: {
          necessary: old.categories.necessary,
          // analytics renamed to stats
          stats: old.categories.analytics,
          ads: 'denied',
        },
      }),
    );

    const consent = createPrivionConsent({
      version: 2,
      storage: { type: 'localStorage' },
      categories: [
        { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
        { id: 'stats', label: 'Stats', defaultStatus: 'denied' },
        { id: 'ads', label: 'Ads', defaultStatus: 'denied' },
      ],
      migrations: [{ from: 1, to: 2, migrate }],
    });

    expect(migrate).toHaveBeenCalledTimes(1);
    expect(consent.getState().version).toBe(2);
    expect(consent.getState().categories.stats).toBe('granted');
    expect(consent.getState().userDecided).toBe(true);
  });

  it('chains multiple migrations forward', () => {
    seed({ version: 1, categories: { necessary: 'granted', analytics: 'granted' } });

    const oneToTwo: ConsentMigration = {
      from: 1,
      to: 2,
      migrate: (old) => ({
        ...old,
        version: 2,
        categories: { necessary: old.categories.necessary, stats: old.categories.analytics },
      }),
    };
    const twoToThree: ConsentMigration = {
      from: 2,
      to: 3,
      migrate: (old) => ({
        ...old,
        version: 3,
        categories: { ...old.categories, ads: 'denied' },
      }),
    };

    const consent = createPrivionConsent({
      version: 3,
      storage: { type: 'localStorage' },
      categories: v3Categories,
      migrations: [oneToTwo, twoToThree],
    });

    expect(consent.getState().version).toBe(3);
    expect(consent.getState().categories.stats).toBe('granted');
    expect(consent.getState().categories.ads).toBe('denied');
  });

  it('falls back to defaults when the chain is incomplete', () => {
    seed({ version: 1, categories: { necessary: 'granted', analytics: 'granted' } });

    // Only the 2→3 step exists; 1→2 is missing so the chain can't complete.
    const consent = createPrivionConsent({
      version: 3,
      storage: { type: 'localStorage' },
      categories: v3Categories,
      migrations: [
        {
          from: 2,
          to: 3,
          migrate: (old) => ({ ...old, version: 3 }),
        },
      ],
    });

    expect(consent.getState().version).toBe(3);
    // Defaults applied — stats stays denied, no leaked stats="granted" from v1.
    expect(consent.getState().categories.stats).toBe('denied');
    expect(consent.getState().userDecided).toBe(false);
  });

  it('falls back to defaults when a migration returns the wrong version', () => {
    seed({ version: 1, categories: { necessary: 'granted', analytics: 'granted' } });

    const consent = createPrivionConsent({
      version: 2,
      storage: { type: 'localStorage' },
      categories: [
        { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
        { id: 'stats', label: 'Stats', defaultStatus: 'denied' },
      ],
      migrations: [
        {
          from: 1,
          to: 2,
          // Bug: returns version 5 instead of 2.
          migrate: (old) => ({ ...old, version: 5, categories: { necessary: 'granted' } }),
        },
      ],
    });

    expect(consent.getState().version).toBe(2);
    expect(consent.getState().userDecided).toBe(false); // defaults
  });

  it('falls back to defaults when a migration leaves orphaned category ids', () => {
    seed({ version: 1, categories: { necessary: 'granted', legacy: 'granted' } });

    const consent = createPrivionConsent({
      version: 2,
      storage: { type: 'localStorage' },
      categories: [
        { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
      ],
      migrations: [
        {
          from: 1,
          to: 2,
          // Bug: migration didn't drop the `legacy` id, but the v2 config
          // doesn't declare it. Engine should reject and fall back.
          migrate: (old) => ({ ...old, version: 2 }),
        },
      ],
    });

    expect(consent.getState().userDecided).toBe(false);
    expect('legacy' in consent.getState().categories).toBe(false);
  });

  it('falls back to defaults when a migration throws', () => {
    seed({ version: 1, categories: { necessary: 'granted' } });

    const consent = createPrivionConsent({
      version: 2,
      storage: { type: 'localStorage' },
      categories: [
        { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
      ],
      migrations: [
        {
          from: 1,
          to: 2,
          migrate: () => {
            throw new Error('whoops');
          },
        },
      ],
    });

    expect(consent.getState().userDecided).toBe(false);
  });
});
