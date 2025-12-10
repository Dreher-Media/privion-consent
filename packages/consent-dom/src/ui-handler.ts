import type { PrivionConsent } from '@privion-consent/core'

/**
 * Handle UI elements (banner, preferences, buttons)
 */
export class UIHandler {
  private consent: PrivionConsent
  private banner: HTMLElement | null = null
  private preferences: HTMLElement | null = null

  constructor(consent: PrivionConsent) {
    this.consent = consent
  }

  /**
   * Initialize UI handler
   */
  init(root: HTMLElement | Document = document): void {
    // Find banner and preferences
    this.banner = root.querySelector('[privion-banner]')
    this.preferences = root.querySelector('[privion-preferences]')

    // Wire up buttons
    this.wireButtons(root)

    // Initial visibility
    this.updateBannerVisibility()
    if (this.preferences) {
      this.preferences.hidden = true
    }

    // Subscribe to updates to show banner if needed
    this.consent.on('update', () => {
      this.updateBannerVisibility()
    })
  }

  /**
   * Wire up UI buttons and controls
   */
  private wireButtons(root: HTMLElement | Document): void {
    // Accept all button
    const acceptAllBtn = root.querySelector('[privion-accept-all]')
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => {
        this.consent.acceptAll()
        this.hideBanner()
        this.hidePreferences()
      })
    }

    // Reject all button
    const rejectAllBtn = root.querySelector('[privion-reject-all]')
    if (rejectAllBtn) {
      rejectAllBtn.addEventListener('click', () => {
        this.consent.rejectAll()
        this.hideBanner()
        this.hidePreferences()
      })
    }

    // Open preferences button
    const openPrefsBtn = root.querySelector('[privion-open-preferences]')
    if (openPrefsBtn) {
      openPrefsBtn.addEventListener('click', () => {
        this.showPreferences()
      })
    }

    // Save preferences button
    const savePrefsBtn = root.querySelector('[privion-save-preferences]')
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => {
        this.savePreferences()
        this.hideBanner()
        this.hidePreferences()
      })
    }

    // Wire up toggles
    this.wireToggles(root)
  }

  /**
   * Wire up category toggle checkboxes
   */
  private wireToggles(root: HTMLElement | Document): void {
    const toggles = root.querySelectorAll<HTMLInputElement>('[privion-toggle]')

    for (const toggle of Array.from(toggles)) {
      const categoryId = toggle.getAttribute('privion-toggle')
      if (!categoryId) {
        continue
      }

      // Set initial state
      const state = this.consent.getState()
      const status = state.categories[categoryId] || 'unknown'
      toggle.checked = status === 'granted'

      // Handle changes
      toggle.addEventListener('change', () => {
        const newStatus = toggle.checked ? 'granted' : 'denied'
        this.consent.setCategory(categoryId, newStatus)
      })

      // Update on consent changes
      this.consent.on('update', (state) => {
        const currentStatus = state.categories[categoryId] || 'unknown'
        toggle.checked = currentStatus === 'granted'
      })
    }

    // Wire up required category displays
    const required = root.querySelectorAll('[privion-required]')
    for (const element of Array.from(required)) {
      const categoryId = element.getAttribute('privion-required')
      if (!categoryId) {
        continue
      }

      const checkbox = (element as HTMLElement).querySelector<HTMLInputElement>(
        'input[type="checkbox"]'
      )
      if (checkbox) {
        checkbox.disabled = true
        checkbox.checked = true
      }
    }
  }

  /**
   * Update banner visibility based on consent state
   */
  private updateBannerVisibility(): void {
    if (!this.banner) {
      return
    }

    const state = this.consent.getState()
    const hasDecision = Object.values(state.categories).some(
      (status) => status !== 'unknown'
    )

    // Show banner if no decision has been made (all optional categories are unknown)
    // This is a simple heuristic - you might want to customize this
    this.banner.hidden = hasDecision
  }

  /**
   * Show preferences dialog
   */
  private showPreferences(): void {
    if (this.preferences) {
      this.preferences.hidden = false
    }
  }

  /**
   * Hide preferences dialog
   */
  private hidePreferences(): void {
    if (this.preferences) {
      this.preferences.hidden = true
    }
  }

  /**
   * Hide banner
   */
  private hideBanner(): void {
    if (this.banner) {
      this.banner.hidden = true
    }
  }

  /**
   * Save preferences from toggles
   */
  private savePreferences(): void {
    const state = this.consent.getState()
    const updates: Record<string, 'granted' | 'denied'> = {}

    // Read all toggles
    const toggles = document.querySelectorAll<HTMLInputElement>('[privion-toggle]')
    for (const toggle of Array.from(toggles)) {
      const categoryId = toggle.getAttribute('privion-toggle')
      if (categoryId) {
        updates[categoryId] = toggle.checked ? 'granted' : 'denied'
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      this.consent.setMany(updates)
      // Mark source as preferences
      const newState = this.consent.getState()
      ;(newState as any).source = 'preferences'
    }
  }
}
