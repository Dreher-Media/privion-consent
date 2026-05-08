import { beforeEach, describe, expect, it } from 'vitest';
import { createPrivionConsent, resolveRegionMode } from '../consent-engine.js';
import type { PrivionConsentConfig } from '../types.js';

const baseCategories: PrivionConsentConfig['categories'] = [
  { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
  { id: 'analytics', label: 'Analytics' }, // no defaultStatus — region drives this
  { id: 'marketing', label: 'Marketing' },
];

beforeEach(() => {
  localStorage.clear();
});

describe('resolveRegionMode', () => {
  it('returns the matching regionRules entry (case-insensitive)', () => {
    expect(
      resolveRegionMode({
        version: 1,
        categories: baseCategories,
        region: 'de',
        regionRules: { DE: { mode: 'opt-in' } },
      }),
    ).toBe('opt-in');
  });

  it('falls back to defaultRegionMode when no rule matches', () => {
    expect(
      resolveRegionMode({
        version: 1,
        categories: baseCategories,
        region: 'JP',
        regionRules: { DE: { mode: 'opt-in' } },
        defaultRegionMode: 'opt-out',
      }),
    ).toBe('opt-out');
  });

  it('returns undefined when nothing is configured', () => {
    expect(resolveRegionMode({ version: 1, categories: baseCategories })).toBeUndefined();
  });
});

describe('Initialization with region defaults', () => {
  it('uses "unknown" for unset categories in opt-in mode', () => {
    const consent = createPrivionConsent({
      version: 1,
      categories: baseCategories,
      region: 'DE',
      regionRules: { DE: { mode: 'opt-in' } },
    });
    expect(consent.getState().categories.analytics).toBe('unknown');
    expect(consent.getState().categories.marketing).toBe('unknown');
  });

  it('uses "granted" for unset categories in opt-out mode', () => {
    const consent = createPrivionConsent({
      version: 1,
      categories: baseCategories,
      region: 'US',
      regionRules: { US: { mode: 'opt-out' } },
    });
    expect(consent.getState().categories.analytics).toBe('granted');
    expect(consent.getState().categories.marketing).toBe('granted');
  });

  it('honors explicit defaultStatus over the regional fallback', () => {
    const consent = createPrivionConsent({
      version: 1,
      categories: [
        { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
        { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' }, // explicit wins
        { id: 'marketing', label: 'Marketing' }, // takes the regional fallback
      ],
      region: 'US',
      regionRules: { US: { mode: 'opt-out' } },
    });
    expect(consent.getState().categories.analytics).toBe('denied');
    expect(consent.getState().categories.marketing).toBe('granted');
  });

  it('falls back to legacy "unknown" when neither region nor defaultRegionMode is set', () => {
    const consent = createPrivionConsent({
      version: 1,
      categories: baseCategories,
    });
    expect(consent.getState().categories.analytics).toBe('unknown');
  });

  it('uses defaultRegionMode when region is given but unmatched', () => {
    const consent = createPrivionConsent({
      version: 1,
      categories: baseCategories,
      region: 'JP',
      regionRules: { DE: { mode: 'opt-in' } },
      defaultRegionMode: 'opt-out',
    });
    expect(consent.getState().categories.analytics).toBe('granted');
  });
});
