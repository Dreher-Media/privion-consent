import type { PrivionConsent } from '@privion-consent/core';

const ACCEPT = '[privion-accept-all]';
const REJECT = '[privion-reject-all]';
const OPEN = '[privion-open-preferences]';
const CLOSE = '[privion-close-preferences]';
const SAVE = '[privion-save-preferences]';
const TOGGLE = '[privion-toggle]';
const REQUIRED = '[privion-required]';

/**
 * Handle UI elements (banner, preferences, buttons).
 *
 * Buttons are wired by event delegation: one click listener on the root
 * handles every `[privion-accept-all]`, `[privion-reject-all]`,
 * `[privion-open-preferences]`, `[privion-close-preferences]` and
 * `[privion-save-preferences]`, however many there are and whenever
 * they were added (an "Accept all" in the preferences footer, a
 * "Load and accept" button in an embed placeholder rendered later, …).
 */
export class UIHandler {
  private consent: PrivionConsent;
  private root: HTMLElement | Document = document;
  private bannerEl: HTMLElement | null = null;
  private preferencesEl: HTMLElement | null = null;
  private hasInitializedVisibility = false;
  private unsubscribes: Array<() => void> = [];
  /** Element that had focus before the preferences opened; restored on close. */
  private returnFocus: HTMLElement | null = null;

  constructor(consent: PrivionConsent) {
    this.consent = consent;
  }

  /**
   * Initialize UI handler
   */
  init(root: HTMLElement | Document = document): void {
    this.root = root;
    this.bannerEl = root.querySelector('[privion-banner]');
    this.preferencesEl = root.querySelector('[privion-preferences]');

    // Hide by default to prevent loading flash. They are shown when needed.
    if (this.bannerEl) {
      this.bannerEl.hidden = true;
    }
    if (this.preferencesEl) {
      this.preferencesEl.hidden = true;
    }

    const onClick = (event: Event) => {
      this.handleClick(event);
    };
    root.addEventListener('click', onClick);
    this.unsubscribes.push(() => {
      root.removeEventListener('click', onClick);
    });

    const doc = root instanceof Document ? root : root.ownerDocument;
    const onKeydown = (event: KeyboardEvent) => {
      const prefs = this.preferences;
      if (event.key === 'Escape' && prefs && !prefs.hidden) {
        this.hidePreferences();
      }
    };
    doc.addEventListener('keydown', onKeydown);
    this.unsubscribes.push(() => {
      doc.removeEventListener('keydown', onKeydown);
    });

    this.syncRequired();
    this.syncToggles();

    // Initial visibility once the engine is ready. `ready` replays to late
    // subscribers, so this also covers an engine created long before.
    const updateInitialVisibility = () => {
      if (!this.hasInitializedVisibility) {
        this.hasInitializedVisibility = true;
        // Defer so the DOM is fully ready and to avoid racing other handlers.
        setTimeout(() => {
          this.updateBannerVisibility();
        }, 10);
      }
    };
    this.unsubscribes.push(this.consent.on('ready', updateInitialVisibility));

    this.unsubscribes.push(
      this.consent.on('update', () => {
        // Reflect commits (Accept all, Save, a programmatic setCategory)
        // back into the switches, and show/hide the banner.
        this.syncToggles();
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

  /** The banner, re-resolved if the one found at init was replaced. */
  private get banner(): HTMLElement | null {
    if (!this.bannerEl?.isConnected) {
      this.bannerEl = this.root.querySelector('[privion-banner]');
    }
    return this.bannerEl;
  }

  /** The preferences modal, re-resolved if the one found at init was replaced. */
  private get preferences(): HTMLElement | null {
    if (!this.preferencesEl?.isConnected) {
      this.preferencesEl = this.root.querySelector('[privion-preferences]');
    }
    return this.preferencesEl;
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(CLOSE)) {
      this.hidePreferences();
      return;
    }
    if (target.closest(ACCEPT)) {
      this.consent.acceptAll();
      this.hideBanner();
      this.hidePreferences();
      return;
    }
    if (target.closest(REJECT)) {
      this.consent.rejectAll();
      this.hideBanner();
      this.hidePreferences();
      return;
    }
    if (target.closest(SAVE)) {
      this.savePreferences();
      this.hideBanner();
      this.hidePreferences();
      return;
    }
    if (target.closest(OPEN)) {
      // Reset staging switches to the committed engine state so that
      // closing the modal mid-edit and reopening discards the abandoned
      // half-edit rather than preserving it.
      this.syncToggles();
      this.showPreferences();
      return;
    }
    // A click on the backdrop — the `[privion-preferences]` element
    // itself, outside its panel — closes the modal.
    const prefs = this.preferences;
    if (prefs && target === prefs) {
      this.hidePreferences();
    }
  }

  /**
   * Set every `[privion-toggle]` switch to the engine's committed state.
   *
   * Switches are *staging only*: changing one does NOT commit to the
   * engine. The edit is committed by `[privion-save-preferences]` (or
   * Accept all / Reject all), so the modal is a staging area the user can
   * abandon by closing it.
   */
  private syncToggles(): void {
    const state = this.consent.getState();
    for (const toggle of Array.from(this.root.querySelectorAll<HTMLInputElement>(TOGGLE))) {
      const categoryId = toggle.getAttribute('privion-toggle');
      if (categoryId) {
        toggle.checked = (state.categories[categoryId] || 'unknown') === 'granted';
      }
    }
  }

  /** Required categories render as checked, disabled switches. */
  private syncRequired(): void {
    for (const element of Array.from(this.root.querySelectorAll<HTMLElement>(REQUIRED))) {
      const checkbox =
        element instanceof HTMLInputElement
          ? element
          : element.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (checkbox) {
        checkbox.disabled = true;
        checkbox.checked = true;
      }
    }
  }

  /**
   * Update banner visibility based on consent state.
   *
   * Driven solely by `userDecided`: the banner stays open until the user
   * explicitly accepts/rejects or saves preferences. Programmatic
   * `setCategory()` calls leave `userDecided` false, so a host app
   * pre-seeding categories doesn't dismiss the banner by accident.
   */
  private updateBannerVisibility(): void {
    const banner = this.banner;
    if (banner) {
      banner.hidden = this.consent.getState().userDecided;
    }
  }

  private showPreferences(): void {
    const prefs = this.preferences;
    if (!prefs || !prefs.hidden) {
      return;
    }
    const active = prefs.ownerDocument.activeElement;
    this.returnFocus = active instanceof HTMLElement ? active : null;
    prefs.hidden = false;
    // Move focus into the dialog so keyboard and screen-reader users land
    // in it: the first switch they can change, else any control.
    const target =
      prefs.querySelector<HTMLElement>(TOGGLE) ??
      prefs.querySelector<HTMLElement>('button, input:not([disabled]), [href]');
    target?.focus();
  }

  private hidePreferences(): void {
    const prefs = this.preferences;
    if (!prefs || prefs.hidden) {
      return;
    }
    prefs.hidden = true;
    const back = this.returnFocus;
    this.returnFocus = null;
    if (back?.isConnected && !back.closest('[hidden]')) {
      back.focus();
    }
  }

  private hideBanner(): void {
    const banner = this.banner;
    if (banner) {
      banner.hidden = true;
    }
  }

  /** Commit the staged switches as one user decision. */
  private savePreferences(): void {
    const updates: Record<string, 'granted' | 'denied'> = {};
    for (const toggle of Array.from(this.root.querySelectorAll<HTMLInputElement>(TOGGLE))) {
      const categoryId = toggle.getAttribute('privion-toggle');
      if (categoryId) {
        updates[categoryId] = toggle.checked ? 'granted' : 'denied';
      }
    }
    // Always commit, even with no switches on the page or nothing
    // changed: Save is the user's decision and must be recorded.
    this.consent.setMany(updates, 'preferences');
  }
}
