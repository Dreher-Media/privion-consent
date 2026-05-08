import type { ConsentState, GoogleConsentMapping, PrivionConsentConfig } from './types.js';

declare global {
  interface Window {
    gtag?: (command: string, action: string, params: Record<string, unknown>) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Google Consent Mode v2 sync command.
 *
 * - `default`: emitted before the user makes a choice. Tells gtag the
 *   pre-consent stance (all denied in our payload). Only relevant in
 *   `advanced` mode — `basic` mode skips it entirely so nothing hits
 *   the dataLayer until the user has decided.
 * - `update`: emitted after every user-visible state change.
 */
type GcmCommand = 'default' | 'update';

/**
 * Default mapping from category IDs to Google Consent Mode fields
 * This can be overridden per category via googleMapping
 */
const DEFAULT_CATEGORY_MAPPINGS: Record<string, Partial<GoogleConsentMapping>> = {
  analytics: {
    analytics_storage: 'granted',
  },
  marketing: {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  },
};

/**
 * Compute Google Consent Mode payload from current consent state
 */
export function computeGoogleConsentMode(
  state: ConsentState,
  config: PrivionConsentConfig,
): GoogleConsentMapping {
  // Start with all denied
  const mapping: GoogleConsentMapping = {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  };

  // Process each category
  for (const category of config.categories) {
    const status = state.categories[category.id] || category.defaultStatus || 'unknown';

    if (status === 'granted') {
      // Use category-specific mapping if provided, otherwise use defaults
      const categoryMapping =
        category.googleMapping || DEFAULT_CATEGORY_MAPPINGS[category.id] || {};

      // Apply the mapping
      if (categoryMapping.ad_storage) {
        mapping.ad_storage = categoryMapping.ad_storage;
      }
      if (categoryMapping.analytics_storage) {
        mapping.analytics_storage = categoryMapping.analytics_storage;
      }
      if (categoryMapping.ad_user_data) {
        mapping.ad_user_data = categoryMapping.ad_user_data;
      }
      if (categoryMapping.ad_personalization) {
        mapping.ad_personalization = categoryMapping.ad_personalization;
      }
    }
  }

  return mapping;
}

/**
 * Send Google Consent Mode update to the tag provider.
 *
 * Mode semantics:
 *
 * - `basic`: do not announce a `default` payload before the user
 *   decides. The host app blocks Google tags entirely until consent
 *   (typically via `<script type="privion">`), so pre-consent gtag
 *   chatter is meaningless. Returns early when `command === 'default'`.
 * - `advanced`: emit `default` immediately so any non-blocked Google
 *   tags know to switch into anonymized cookieless pings until the
 *   user accepts. After consent, emit `update`.
 *
 * In both modes `update` is always sent. The function tries gtag
 * first, falls back to a `dataLayer` push, and finally dispatches a
 * `privion:google-consent-mode` custom event so consumers without
 * gtag/dataLayer can observe the change.
 */
export function syncGoogleConsentMode(
  mapping: GoogleConsentMapping,
  mode: 'basic' | 'advanced' = 'basic',
  isFirstLoad: boolean = false,
): void {
  const command: GcmCommand = isFirstLoad ? 'default' : 'update';

  // In basic mode the library does not announce a pre-consent default.
  if (mode === 'basic' && command === 'default') {
    return;
  }

  // Try gtag first (Google Tag Manager / Google Analytics)
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', command, mapping);
    return;
  }

  // Try dataLayer (Google Tag Manager)
  if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: 'consent_' + command,
      ...mapping,
    });
    return;
  }

  // Fallback: dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('privion:google-consent-mode', {
        detail: { command, mapping, mode },
      }),
    );
  }
}
