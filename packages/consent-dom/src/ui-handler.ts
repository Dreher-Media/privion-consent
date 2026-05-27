import type { PrivionConsent } from '@privion-consent/core';

/**
 * Handle UI elements (banner, preferences, buttons)
 */
export class UIHandler {
  private consent: PrivionConsent;
  private banner: HTMLElement | null = null;
  private preferences: HTMLElement | null = null;
  private hasInitializedVisibility = false;
  private unsubscribes: Array<() => void> = [];

  constructor(consent: PrivionConsent) {
    this.consent = consent;
  }

  /**
   * Initialize UI handler
   */
  init(root: HTMLElement | Document = document): void {
    // Find banner and preferences
    this.banner = root.querySelector('[privion-banner]');
    this.preferences = root.querySelector('[privion-preferences]');

    // Hide by default to prevent loading flash
    // They will be shown when needed
    if (this.banner) {
      this.banner.hidden = true;
    }
    if (this.preferences) {
      this.preferences.hidden = true;
    }

    // Wire up buttons
    this.wireButtons(root);

    // Initial visibility - update once after ready event
    // The 'ready' event is emitted synchronously in the constructor,
    // so we need to check if it already fired
    const updateInitialVisibility = () => {
      if (!this.hasInitializedVisibility && this.banner) {
        this.hasInitializedVisibility = true;
        // Use setTimeout to ensure DOM is fully ready and avoid race conditions
        setTimeout(() => {
          this.updateBannerVisibility();
        }, 10);
      }
    };

    // Subscribe to ready event (will fire if not already fired)
    this.unsubscribes.push(this.consent.on('ready', updateInitialVisibility));

    // Check immediately - if ready already fired, this will update
    // If not, the event handler above will handle it
    updateInitialVisibility();

    // Subscribe to updates to show banner if needed
    this.unsubscribes.push(
      this.consent.on('update', () => {
        this.updateBannerVisibility();
      }),
    );
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.unsubscribes = [];
  }

  /**
   * Wire up UI buttons and controls
   */
  private wireButtons(root: HTMLElement | Document): void {
    // Accept all button
    const acceptAllBtn = root.querySelector('[privion-accept-all]');
    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => {
        this.consent.acceptAll();
        this.hideBanner();
        this.hidePreferences();
      });
    }

    // Reject all button
    const rejectAllBtn = root.querySelector('[privion-reject-all]');
    if (rejectAllBtn) {
      rejectAllBtn.addEventListener('click', () => {
        this.consent.rejectAll();
        this.hideBanner();
        this.hidePreferences();
      });
    }

    // Open preferences buttons (can be multiple)
    const openPrefsBtns = root.querySelectorAll('[privion-open-preferences]');
    openPrefsBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        // Reset staging checkboxes to the committed engine state so that
        // closing the modal mid-edit and reopening discards the abandoned
        // half-edit rather than preserving it.
        this.syncToggles(root);
        this.showPreferences();
      });
    });

    // Save preferences button
    const savePrefsBtn = root.querySelector('[privion-save-preferences]');
    if (savePrefsBtn) {
      savePrefsBtn.addEventListener('click', () => {
        this.savePreferences();
        this.hideBanner();
        this.hidePreferences();
      });
    }

    // Wire up toggles
    this.wireToggles(root);
  }

  /**
   * Wire up category toggle checkboxes.
   *
   * Toggles are *staging only*: changing a checkbox does NOT commit to the
   * engine. The user's edit is committed when they click
   * `[privion-save-preferences]` (or via Accept all / Reject all elsewhere).
   * This lets the preferences modal act as a proper staging area where the
   * user can change their mind or close the modal to discard.
   */
  private wireToggles(root: HTMLElement | Document): void {
    const toggles = root.querySelectorAll<HTMLInputElement>('[privion-toggle]');

    for (const toggle of Array.from(toggles)) {
      const categoryId = toggle.getAttribute('privion-toggle');
      if (!categoryId) {
        continue;
      }

      // Set initial state from the engine.
      const state = this.consent.getState();
      const status = state.categories[categoryId] || 'unknown';
      toggle.checked = status === 'granted';

      // Reflect external commits back into the checkbox (e.g. Accept all,
      // Save preferences, or a programmatic setCategory from host code).
      this.unsubscribes.push(
        this.consent.on('update', (next) => {
          const currentStatus = next.categories[categoryId] || 'unknown';
          toggle.checked = currentStatus === 'granted';
        }),
      );
    }

    // Wire up required category displays
    const required = root.querySelectorAll('[privion-required]');
    for (const element of Array.from(required)) {
      const categoryId = element.getAttribute('privion-required');
      if (!categoryId) {
        continue;
      }

      const checkbox = (element as HTMLElement).querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      );
      if (checkbox) {
        checkbox.disabled = true;
        checkbox.checked = true;
      }
    }
  }

  /**
   * Reset all `[privion-toggle]` checkboxes under `root` to the engine's
   * current committed state. Called when the preferences modal is opened
   * so any abandoned half-edit from a previous session is discarded.
   */
  private syncToggles(root: HTMLElement | Document): void {
    const toggles = root.querySelectorAll<HTMLInputElement>('[privion-toggle]');
    const state = this.consent.getState();
    for (const toggle of Array.from(toggles)) {
      const categoryId = toggle.getAttribute('privion-toggle');
      if (!categoryId) {
        continue;
      }
      const status = state.categories[categoryId] || 'unknown';
      toggle.checked = status === 'granted';
    }
  }

  /**
   * Update banner visibility based on consent state.
   *
   * Driven solely by `userDecided`: the banner stays open until the user
   * explicitly accepts/rejects via the banner or saves preferences. This
   * is robust against programmatic `setCategory()` calls (which leave
   * `userDecided` false) so a host app pre-seeding categories from code
   * doesn't accidentally dismiss the banner.
   */
  private updateBannerVisibility(): void {
    if (!this.banner) {
      return;
    }
    this.banner.hidden = this.consent.getState().userDecided;
  }

  /**
   * Show preferences dialog
   */
  private showPreferences(): void {
    if (this.preferences) {
      this.preferences.hidden = false;
    }
  }

  /**
   * Hide preferences dialog
   */
  private hidePreferences(): void {
    if (this.preferences) {
      this.preferences.hidden = true;
    }
  }

  /**
   * Hide banner
   */
  private hideBanner(): void {
    if (this.banner) {
      this.banner.hidden = true;
    }
  }

  /**
   * Save preferences from toggles
   */
  private savePreferences(): void {
    const updates: Record<string, 'granted' | 'denied'> = {};

    // Read all toggles
    const toggles = document.querySelectorAll<HTMLInputElement>('[privion-toggle]');
    for (const toggle of Array.from(toggles)) {
      const categoryId = toggle.getAttribute('privion-toggle');
      if (categoryId) {
        updates[categoryId] = toggle.checked ? 'granted' : 'denied';
      }
    }

    if (Object.keys(updates).length > 0) {
      this.consent.setMany(updates, 'preferences');
    }
  }
}
