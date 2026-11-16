import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPrivionConsent } from '../consent-engine.js';
import { syncGoogleConsentMode } from '../google-consent-mode.js';
import type { GoogleConsentMapping, PrivionConsentConfig } from '../types.js';

const baseConfig: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
    { id: 'marketing', label: 'Marketing', defaultStatus: 'denied' },
  ],
};

const allDenied: GoogleConsentMapping = {
  ad_storage: 'denied',
  analytics_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

/**
 * Reading from this array is how we observe the commands the function
 * would have sent. Entries are gtag `arguments` objects:
 * `['consent', 'default' | 'update', payload]`.
 */
function installDataLayer(): unknown[] {
  const dataLayer: unknown[] = [];
  (window as unknown as { dataLayer: typeof dataLayer }).dataLayer = dataLayer;
  delete (window as { gtag?: unknown }).gtag;
  return dataLayer;
}

interface GtagCall {
  isArguments: boolean;
  name: unknown;
  command: unknown;
  payload: Record<string, unknown>;
}

function call(entry: unknown): GtagCall {
  const args = entry as ArrayLike<unknown>;
  return {
    isArguments: Object.prototype.toString.call(entry) === '[object Arguments]',
    name: args[0],
    command: args[1],
    payload: args[2] as Record<string, unknown>,
  };
}

function uninstallDataLayer(): void {
  delete (window as { dataLayer?: unknown }).dataLayer;
}

describe('syncGoogleConsentMode (low-level)', () => {
  let dataLayer: unknown[];

  beforeEach(() => {
    dataLayer = installDataLayer();
  });
  afterEach(uninstallDataLayer);

  it('emits "default" in advanced mode on first load', () => {
    syncGoogleConsentMode(allDenied, 'advanced', true);
    expect(dataLayer).toHaveLength(1);
    const c = call(dataLayer[0]);
    // GTM reads consent only from gtag `arguments` objects.
    expect(c.isArguments).toBe(true);
    expect(c.name).toBe('consent');
    expect(c.command).toBe('default');
    expect(c.payload).toMatchObject({ ad_storage: 'denied', wait_for_update: 500 });
  });

  it('honors a custom wait_for_update on "default"', () => {
    syncGoogleConsentMode(allDenied, 'advanced', true, { waitForUpdate: 1200 });
    expect(call(dataLayer[0]).payload.wait_for_update).toBe(1200);
  });

  it('creates window.dataLayer when neither gtag nor dataLayer exist', () => {
    uninstallDataLayer();
    syncGoogleConsentMode(allDenied, 'advanced', true);
    const created = (window as { dataLayer?: unknown[] }).dataLayer;
    expect(created).toHaveLength(1);
    expect(call(created![0]).command).toBe('default');
  });

  it('calls window.gtag directly when present', () => {
    const calls: unknown[][] = [];
    (window as { gtag?: unknown }).gtag = (...args: unknown[]) => calls.push(args);
    syncGoogleConsentMode(allDenied, 'advanced', false);
    delete (window as { gtag?: unknown }).gtag;
    expect(calls).toEqual([['consent', 'update', { ...allDenied }]]);
    expect(dataLayer).toHaveLength(0);
  });

  it('skips "default" in basic mode (no pre-consent chatter)', () => {
    syncGoogleConsentMode(allDenied, 'basic', true);
    expect(dataLayer).toHaveLength(0);
  });

  it('emits "update" in basic mode on subsequent calls', () => {
    syncGoogleConsentMode(allDenied, 'basic', false);
    expect(dataLayer).toHaveLength(1);
    expect(call(dataLayer[0]).command).toBe('update');
    expect(call(dataLayer[0]).payload).not.toHaveProperty('wait_for_update');
  });

  it('emits "update" in advanced mode on subsequent calls', () => {
    syncGoogleConsentMode(allDenied, 'advanced', false);
    expect(dataLayer).toHaveLength(1);
    expect(call(dataLayer[0]).command).toBe('update');
    expect(call(dataLayer[0]).payload).not.toHaveProperty('wait_for_update');
  });
});

describe('PrivionConsent <> Google Consent Mode integration', () => {
  let dataLayer: unknown[];

  beforeEach(() => {
    localStorage.clear();
    dataLayer = installDataLayer();
  });
  afterEach(uninstallDataLayer);

  it('does not emit anything in basic mode for a new visitor on init', () => {
    createPrivionConsent({ ...baseConfig, googleConsentMode: { mode: 'basic' } });
    expect(dataLayer).toHaveLength(0);
  });

  it('emits a "default" event in advanced mode for a new visitor on init', () => {
    createPrivionConsent({ ...baseConfig, googleConsentMode: { mode: 'advanced' } });
    expect(dataLayer).toHaveLength(1);
    expect(call(dataLayer[0]).command).toBe('default');
  });

  it('emits "update" on init for a returning (decided) visitor — both modes', () => {
    // Seed a previously-decided state in localStorage.
    localStorage.setItem(
      'privion-consent',
      JSON.stringify({
        categories: { necessary: 'granted', analytics: 'granted', marketing: 'denied' },
        updatedAt: new Date().toISOString(),
        version: 1,
        source: 'banner',
        userDecided: true,
      }),
    );

    createPrivionConsent({
      ...baseConfig,
      storage: { type: 'localStorage' },
      googleConsentMode: { mode: 'basic' },
    });

    expect(dataLayer).toHaveLength(1);
    expect(call(dataLayer[0]).command).toBe('update');
    expect(call(dataLayer[0]).payload.analytics_storage).toBe('granted');
  });

  it('emits "update" after acceptAll in basic mode', () => {
    const consent = createPrivionConsent({
      ...baseConfig,
      googleConsentMode: { mode: 'basic' },
    });
    expect(dataLayer).toHaveLength(0); // init was skipped

    consent.acceptAll();

    expect(dataLayer).toHaveLength(1);
    expect(call(dataLayer[0]).command).toBe('update');
    expect(call(dataLayer[0]).payload.analytics_storage).toBe('granted');
    expect(call(dataLayer[0]).payload.ad_storage).toBe('granted');
  });
});
