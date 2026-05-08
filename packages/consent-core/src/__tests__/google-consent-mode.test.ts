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
 * The function guards on `Array.isArray(window.dataLayer)`, so the stub
 * has to be a real array. Reading from this array is how we observe the
 * commands the function would have sent.
 */
function installDataLayer(): Array<Record<string, unknown>> {
  const dataLayer: Array<Record<string, unknown>> = [];
  (window as unknown as { dataLayer: typeof dataLayer }).dataLayer = dataLayer;
  delete (window as { gtag?: unknown }).gtag;
  return dataLayer;
}

function uninstallDataLayer(): void {
  delete (window as { dataLayer?: unknown }).dataLayer;
}

describe('syncGoogleConsentMode (low-level)', () => {
  let dataLayer: Array<Record<string, unknown>>;

  beforeEach(() => {
    dataLayer = installDataLayer();
  });
  afterEach(uninstallDataLayer);

  it('emits "default" in advanced mode on first load', () => {
    syncGoogleConsentMode(allDenied, 'advanced', true);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({
      event: 'consent_default',
      ad_storage: 'denied',
    });
  });

  it('skips "default" in basic mode (no pre-consent chatter)', () => {
    syncGoogleConsentMode(allDenied, 'basic', true);
    expect(dataLayer).toHaveLength(0);
  });

  it('emits "update" in basic mode on subsequent calls', () => {
    syncGoogleConsentMode(allDenied, 'basic', false);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({ event: 'consent_update' });
  });

  it('emits "update" in advanced mode on subsequent calls', () => {
    syncGoogleConsentMode(allDenied, 'advanced', false);
    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toMatchObject({ event: 'consent_update' });
  });
});

describe('PrivionConsent <> Google Consent Mode integration', () => {
  let dataLayer: Array<Record<string, unknown>>;

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
    expect(dataLayer[0]!.event).toBe('consent_default');
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
    expect(dataLayer[0]!.event).toBe('consent_update');
    expect(dataLayer[0]!.analytics_storage).toBe('granted');
  });

  it('emits "update" after acceptAll in basic mode', () => {
    const consent = createPrivionConsent({
      ...baseConfig,
      googleConsentMode: { mode: 'basic' },
    });
    expect(dataLayer).toHaveLength(0); // init was skipped

    consent.acceptAll();

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]!.event).toBe('consent_update');
    expect(dataLayer[0]!.analytics_storage).toBe('granted');
    expect(dataLayer[0]!.ad_storage).toBe('granted');
  });
});
