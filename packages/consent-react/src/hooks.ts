import type { ConsentStatus } from '@privion-consent/core'
import { useConsent } from './context.js'

/**
 * useConsentCategory - Hook to access and update a specific category
 */
export function useConsentCategory(id: string): {
  status: ConsentStatus
  set: (status: ConsentStatus) => void
} {
  const { consent, state } = useConsent()

  const status = state.categories[id] || 'unknown'

  const set = (newStatus: ConsentStatus) => {
    consent.setCategory(id, newStatus)
  }

  return { status, set }
}
