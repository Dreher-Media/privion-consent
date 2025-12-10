import type {
  ConsentState,
  ConsentCategoryConfig,
  GoogleConsentMapping,
  PrivionConsentConfig
} from './types.js';

/**
 * Default mapping from category IDs to Google Consent Mode fields
 * This can be overridden per category via googleMapping
 */
const DEFAULT_CATEGORY_MAPPINGS: Record<string, Partial<GoogleConsentMapping>> = {
  analytics: {
    analytics_storage: 'granted'
  },
  marketing: {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  }
};

/**
 * Compute Google Consent Mode payload from current consent state
 */
export function computeGoogleConsentMode(
  state: ConsentState,
  config: PrivionConsentConfig
): GoogleConsentMapping {
  // Start with all denied
  const mapping: GoogleConsentMapping = {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  };

  // Process each category
  for (const category of config.categories) {
    const status = state.categories[category.id] || category.defaultStatus || 'unknown';

    if (status === 'granted') {
      // Use category-specific mapping if provided, otherwise use defaults
      const categoryMapping = category.googleMapping || DEFAULT_CATEGORY_MAPPINGS[category.id] || {};

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
 * Send Google Consent Mode update to tag provider
 */
export function syncGoogleConsentMode(
  mapping: GoogleConsentMapping,
  mode: 'basic' | 'advanced' = 'basic',
  isFirstLoad: boolean = false
): void {
  const command = isFirstLoad ? 'default' : 'update';

  // Try gtag first (Google Tag Manager / Google Analytics)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('consent', command, mapping);
    return;
  }

  // Try dataLayer (Google Tag Manager)
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'consent_' + command,
      ...mapping
    });
    return;
  }

  // Fallback: dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('privion:google-consent-mode', {
        detail: { command, mapping, mode }
      })
    );
  }
}
