import {
  createPrivionConsent,
  type PrivionConsent,
  type PrivionConsentConfig,
} from '@privion-consent/core';
import { initPrivionDom } from '@privion-consent/dom';

declare global {
  interface Window {
    /** Live engine instance, attached after `bootPrivion` completes. */
    __privionConsent?: PrivionConsent;
  }
}

/**
 * Boot the consent engine and DOM adapter from a serialized config.
 *
 * Used by the `<PrivionScript>` Astro component, but exposed here so
 * host apps that bypass that component (e.g. they want to construct
 * the engine in their own bundle) get the same single-line setup.
 *
 * The instance is attached to `window.__privionConsent` so other
 * client code (analytics scripts, custom UI) can subscribe to events
 * without re-importing the engine.
 */
export function bootPrivion(config: PrivionConsentConfig): PrivionConsent {
  const consent = createPrivionConsent(config);
  initPrivionDom(consent);
  window.__privionConsent = consent;
  return consent;
}

/**
 * Read the JSON-stringified config that the `<PrivionScript>` component
 * serializes into a `<script type="application/json">` element. Returns
 * `null` if the element is missing or the JSON can't be parsed.
 */
export function readSerializedConfig(elementId = 'privion-config'): PrivionConsentConfig | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const el = document.getElementById(elementId);
  if (!el?.textContent) {
    return null;
  }
  try {
    return JSON.parse(el.textContent) as PrivionConsentConfig;
  } catch (e) {
    console.warn('[privion-consent] Failed to parse config JSON:', e);
    return null;
  }
}
