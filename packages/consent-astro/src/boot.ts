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
  interface WindowEventMap {
    /** Fired by `bootPrivion` once the engine is live on `window.__privionConsent`. */
    'privion:ready': CustomEvent<{ consent: PrivionConsent }>;
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
 * without re-importing the engine. Because Astro bundles `<script>`
 * tags as separate modules with no ordering guarantee, a page script
 * may run before this boot does — so after attaching the global, a
 * `privion:ready` CustomEvent (detail: `{ consent }`) is dispatched on
 * `window`. Combined with the engine replaying the `ready` event to
 * late subscribers, consumers never need to poll:
 *
 *   function withConsent(cb) {
 *     if (window.__privionConsent) return cb(window.__privionConsent);
 *     window.addEventListener('privion:ready', (e) => cb(e.detail.consent), { once: true });
 *   }
 */
export function bootPrivion(config: PrivionConsentConfig): PrivionConsent {
  const consent = createPrivionConsent(config);
  initPrivionDom(consent);
  window.__privionConsent = consent;
  window.dispatchEvent(new CustomEvent('privion:ready', { detail: { consent } }));
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
