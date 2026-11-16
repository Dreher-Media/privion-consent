import type { ConsentState, GoogleConsentMapping, PrivionConsentConfig } from './types.js';

declare global {
  interface Window {
    // gtag accepts arbitrary shapes — declare it as a permissive callable
    // to match the real-world signature without forcing every caller to
    // satisfy a narrow type.
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
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
 * Push a Google Consent Mode command.
 *
 * - With `window.gtag` present, call it directly.
 * - Otherwise push onto `window.dataLayer` (created if missing) in the
 *   gtag argument format — `dataLayer.push(arguments)` — which is the
 *   only shape Google Tag Manager reads consent from. A plain object
 *   such as `{ event: 'consent_default', ... }` is ignored by GTM's
 *   consent APIs.
 * - Always dispatch `privion:google-consent-mode` on `window` so other
 *   integrations can observe the signal.
 *
 * In `basic` mode the `default` command is skipped: Google tags are not
 * supposed to load at all before consent there.
 */
export function syncGoogleConsentMode(
  mapping: GoogleConsentMapping,
  mode: 'basic' | 'advanced' = 'basic',
  isFirstLoad: boolean = false,
  options: { waitForUpdate?: number } = {},
): void {
  const command: GcmCommand = isFirstLoad ? 'default' : 'update';

  if (mode === 'basic' && command === 'default') {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  const payload: Record<string, unknown> = { ...mapping };
  if (command === 'default') {
    payload.wait_for_update = options.waitForUpdate ?? 500;
  }

  if (typeof window.gtag === 'function') {
    window.gtag('consent', command, payload);
  } else {
    const dataLayer = (window.dataLayer = window.dataLayer || []);
    pushGtagArguments(dataLayer, ['consent', command, payload]);
  }

  window.dispatchEvent(
    new CustomEvent('privion:google-consent-mode', {
      detail: { command, mapping, mode },
    }),
  );
}

/**
 * The gtag shim from Google's snippet, `function gtag(){dataLayer.push(arguments)}`:
 * GTM only treats an `arguments` object (not an array, not a plain
 * object) as a gtag command.
 */
function pushGtagArguments(dataLayer: unknown[], args: unknown[]): void {
  const gtag = function (): void {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  } as (...a: unknown[]) => void;
  gtag(...args);
}
