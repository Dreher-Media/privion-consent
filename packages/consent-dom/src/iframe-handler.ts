import type { ConsentState, PrivionConsent } from '@privion-consent/core';
import type { CategoryMatchMode } from './types.js';
import { areCategoriesAllowed, parseCategories } from './utils.js';

interface IframeElement {
  element: HTMLIFrameElement;
  categories: string[];
  realSrc: string | null;
  activated: boolean;
}

const IFRAME_SELECTOR = 'iframe[privion-category]';

/**
 * Handle iframe elements with privion-category.
 *
 * Watches the DOM via `MutationObserver` so iframes injected after
 * the initial scan still get registered and activated when consent
 * grants the matching categories.
 */
export class IframeHandler {
  private consent: PrivionConsent;
  private mode: CategoryMatchMode;
  private iframes: Map<HTMLIFrameElement, IframeElement> = new Map();
  private unsubscribeUpdate: (() => void) | null = null;
  private unsubscribeReady: (() => void) | null = null;
  private observer: MutationObserver | null = null;

  constructor(consent: PrivionConsent, mode: CategoryMatchMode = 'any') {
    this.consent = consent;
    this.mode = mode;
  }

  /**
   * Initialize iframe handler
   */
  init(root: HTMLElement | Document = document): void {
    this.scanForIframes(root);

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
          this.scanForIframes(node as Element);
        }
      }
    });
    const target = root instanceof Document ? root.documentElement : root;
    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    }
  }

  /**
   * Register every privion iframe reachable from `root` — the
   * element itself (if it matches) plus any matching descendants.
   */
  private scanForIframes(root: Element | Document): void {
    if (root instanceof Element && root.matches?.(IFRAME_SELECTOR)) {
      this.registerIframe(root as HTMLIFrameElement);
    }
    const descendants = root.querySelectorAll<HTMLIFrameElement>(IFRAME_SELECTOR);
    for (const iframe of Array.from(descendants)) {
      this.registerIframe(iframe);
    }
  }

  private registerIframe(iframe: HTMLIFrameElement): void {
    if (this.iframes.has(iframe)) return;

    const categoryAttr = iframe.getAttribute('privion-category');
    const categories = parseCategories(categoryAttr);
    const realSrc = iframe.getAttribute('privion-src');

    this.iframes.set(iframe, {
      element: iframe,
      categories,
      realSrc,
      activated: false,
    });

    const state = this.consent.getState();
    if (areCategoriesAllowed(categories, state, this.mode) && realSrc) {
      this.activateIframe(iframe);
    }
  }

  /**
   * Handle consent state updates
   */
  private handleConsentUpdate(state: ConsentState): void {
    for (const [iframe, data] of this.iframes.entries()) {
      if (!data.activated && data.realSrc) {
        if (areCategoriesAllowed(data.categories, state, this.mode)) {
          this.activateIframe(iframe);
        }
      }
    }
  }

  /**
   * Activate an iframe by setting its src from privion-src
   */
  private activateIframe(iframe: HTMLIFrameElement): void {
    const data = this.iframes.get(iframe);
    if (!data || data.activated || !data.realSrc) {
      return;
    }
    data.activated = true;
    iframe.src = data.realSrc;
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
    this.iframes.clear();
  }
}
