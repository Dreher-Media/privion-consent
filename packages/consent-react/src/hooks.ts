import type { ConsentSource, ConsentStatus } from '@privion-consent/core';
import { useConsent } from './context.js';

/**
 * useConsentCategory - hook for reading and updating a single category.
 *
 * The returned `set` accepts an optional `source` argument that propagates
 * through to `consent.setCategory(...)`. Pass `'banner'` or `'preferences'`
 * from UI flows where the user is making a real decision; omit it for
 * programmatic reads/writes that should leave `userDecided` untouched.
 */
export function useConsentCategory(id: string): {
  status: ConsentStatus;
  set: (status: ConsentStatus, source?: ConsentSource) => void;
} {
  const { consent, state } = useConsent();

  const status = state.categories[id] || 'unknown';

  const set = (newStatus: ConsentStatus, source?: ConsentSource) => {
    consent.setCategory(id, newStatus, source);
  };

  return { status, set };
}
