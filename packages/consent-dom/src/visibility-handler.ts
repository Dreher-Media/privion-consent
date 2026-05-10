import type { ConsentState, PrivionConsent } from '@privion-consent/core';
import { computeVisibility } from './utils.js';

interface VisibilityElement {
  element: HTMLElement;
  expression: string;
  originalDisplay: string | null;
}

const VISIBILITY_SELECTOR = '[privion]';

/**
 * Handle element visibility based on the `privion` attribute.
 *
 * Watches the DOM via `MutationObserver` so elements injected after
 * the initial scan still get registered and tracked.
 */
export class VisibilityHandler {
  private consent: PrivionConsent;
  private elements: Map<HTMLElement, VisibilityElement> = new Map();
  private unsubscribeUpdate: (() => void) | null = null;
  private unsubscribeReady: (() => void) | null = null;
  private observer: MutationObserver | null = null;

  constructor(consent: PrivionConsent) {
    this.consent = consent;
  }

  /**
   * Initialize visibility handler
   */
  init(root: HTMLElement | Document = document): void {
    this.scanForElements(root);

    this.unsubscribeUpdate = this.consent.on('update', (state) => {
      this.handleConsentUpdate(state);
    });
    this.unsubscribeReady = this.consent.on('ready', (state) => {
      this.handleConsentUpdate(state);
    });

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          this.scanForElements(node as Element);
        }
      }
    });
    const target = root instanceof Document ? root.documentElement : root;
    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    }
  }

  /**
   * Register every `[privion]` element reachable from `root` — the
   * element itself (if it matches) plus any matching descendants.
   * Skips `script[type="privion"]` since those are owned by
   * `ScriptHandler` and should not be hidden via `display: none`.
   */
  private scanForElements(root: Element | Document): void {
    if (root instanceof Element && root.matches?.(VISIBILITY_SELECTOR)) {
      this.registerElement(root as HTMLElement);
    }
    const descendants = root.querySelectorAll<HTMLElement>(VISIBILITY_SELECTOR);
    for (const el of Array.from(descendants)) {
      this.registerElement(el);
    }
  }

  private registerElement(element: HTMLElement): void {
    if (this.elements.has(element)) return;
    if (element.tagName === 'SCRIPT' && element.getAttribute('type') === 'privion') {
      return;
    }

    const expression = element.getAttribute('privion');
    const originalDisplay = element.style.display || null;

    this.elements.set(element, {
      element,
      expression: expression || '',
      originalDisplay,
    });

    const state = this.consent.getState();
    this.updateElementVisibility(element, state);
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
      if (data.originalDisplay !== null) {
        element.style.display = data.originalDisplay;
      } else {
        element.style.display = '';
      }
    } else {
      element.style.display = 'none';
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.unsubscribeUpdate?.();
    this.unsubscribeReady?.();
    this.unsubscribeUpdate = null;
    this.unsubscribeReady = null;
    this.observer?.disconnect();
    this.observer = null;
    this.elements.clear();
  }
}
