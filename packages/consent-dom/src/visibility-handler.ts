import type { PrivionConsent, ConsentState } from '@privion-consent/core';
import { computeVisibility } from './utils.js';

interface VisibilityElement {
  element: HTMLElement;
  expression: string;
  originalDisplay: string | null;
}

/**
 * Handle element visibility based on privion attribute
 */
export class VisibilityHandler {
  private consent: PrivionConsent;
  private elements: Map<HTMLElement, VisibilityElement> = new Map();
  private unsubscribe: (() => void) | null = null;

  constructor(consent: PrivionConsent) {
    this.consent = consent;
  }

  /**
   * Initialize visibility handler
   */
  init(root: HTMLElement | Document = document): void {
    // Scan for existing elements
    this.scanElements(root);

    // Subscribe to consent updates
    this.unsubscribe = this.consent.on('update', (state) => {
      this.handleConsentUpdate(state);
    });

    // Also handle ready event
    this.consent.on('ready', (state) => {
      this.handleConsentUpdate(state);
    });
  }

  /**
   * Scan DOM for elements with privion attribute
   */
  private scanElements(root: HTMLElement | Document): void {
    // Find all elements with privion attribute, excluding scripts with type="privion"
    const allElements = root.querySelectorAll<HTMLElement>('[privion]');

    for (const element of Array.from(allElements)) {
      // Skip scripts with type="privion" (handled separately)
      if (element.tagName === 'SCRIPT' && element.getAttribute('type') === 'privion') {
        continue;
      }

      if (!this.elements.has(element)) {
        const expression = element.getAttribute('privion');
        const originalDisplay = element.style.display || null;

        this.elements.set(element, {
          element,
          expression: expression || '',
          originalDisplay,
        });

        // Apply initial visibility
        const state = this.consent.getState();
        this.updateElementVisibility(element, state);
      }
    }
  }

  /**
   * Handle consent state updates
   */
  private handleConsentUpdate(state: ConsentState): void {
    for (const [element] of this.elements.entries()) {
      this.updateElementVisibility(element, state);
    }
  }

  /**
   * Update element visibility based on consent state
   */
  private updateElementVisibility(element: HTMLElement, state: ConsentState): void {
    const data = this.elements.get(element);
    if (!data) {
      return;
    }

    const visible = computeVisibility(data.expression, state);

    if (visible) {
      // Restore original display or remove inline style
      if (data.originalDisplay !== null) {
        element.style.display = data.originalDisplay;
      } else {
        element.style.display = '';
      }
    } else {
      // Hide element
      element.style.display = 'none';
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.elements.clear();
  }
}
