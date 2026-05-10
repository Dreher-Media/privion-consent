import type { ConsentState, PrivionConsent } from '@privion-consent/core';
import type { CategoryMatchMode } from './types.js';
import { areCategoriesAllowed, parseCategories } from './utils.js';

interface ScriptElement {
  element: HTMLScriptElement;
  categories: string[];
  activated: boolean;
}

const SCRIPT_SELECTOR = 'script[type="privion"]';

/**
 * Handle script elements with type="privion".
 *
 * Watches the DOM via `MutationObserver` so scripts injected after the
 * initial scan (SPA-style hydration, async-loaded markup, framework
 * islands) still get registered and activated when consent grants the
 * matching categories.
 */
export class ScriptHandler {
  private consent: PrivionConsent;
  private mode: CategoryMatchMode;
  private scripts: Map<HTMLScriptElement, ScriptElement> = new Map();
  private unsubscribeUpdate: (() => void) | null = null;
  private unsubscribeReady: (() => void) | null = null;
  private observer: MutationObserver | null = null;

  constructor(consent: PrivionConsent, mode: CategoryMatchMode = 'any') {
    this.consent = consent;
    this.mode = mode;
  }

  /**
   * Initialize script handler
   */
  init(root: HTMLElement | Document = document): void {
    this.scanForScripts(root);

    this.unsubscribeUpdate = this.consent.on('update', (state) => {
      this.handleConsentUpdate(state);
    });
    this.unsubscribeReady = this.consent.on('ready', (state) => {
      this.handleConsentUpdate(state);
    });

    // Watch for scripts injected after the initial scan.
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          this.scanForScripts(node as Element);
        }
      }
    });
    const target = root instanceof Document ? root.documentElement : root;
    if (target) {
      this.observer.observe(target, { childList: true, subtree: true });
    }
  }

  /**
   * Register every privion script reachable from `root` — both the
   * element itself (if it matches) and any matching descendants.
   * Handles both the initial scan and MutationObserver callbacks.
   */
  private scanForScripts(root: Element | Document): void {
    if (root instanceof Element && root.matches?.(SCRIPT_SELECTOR)) {
      this.registerScript(root as HTMLScriptElement);
    }
    const descendants = root.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR);
    for (const script of Array.from(descendants)) {
      this.registerScript(script);
    }
  }

  private registerScript(script: HTMLScriptElement): void {
    if (this.scripts.has(script)) return;

    const categoryAttr = script.getAttribute('privion-category');
    const categories = parseCategories(categoryAttr);

    this.scripts.set(script, {
      element: script,
      categories,
      activated: false,
    });

    const state = this.consent.getState();
    if (areCategoriesAllowed(categories, state, this.mode)) {
      this.activateScript(script);
    }
  }

  /**
   * Handle consent state updates
   */
  private handleConsentUpdate(state: ConsentState): void {
    for (const [script, data] of this.scripts.entries()) {
      if (!data.activated) {
        if (areCategoriesAllowed(data.categories, state, this.mode)) {
          this.activateScript(script);
        }
      }
    }
  }

  /**
   * Activate a script by creating a new executable script element
   */
  private activateScript(originalScript: HTMLScriptElement): void {
    const data = this.scripts.get(originalScript);
    if (!data || data.activated) {
      return;
    }
    data.activated = true;

    const newScript = document.createElement('script');

    if (originalScript.src) {
      newScript.src = originalScript.src;
    } else if (originalScript.textContent) {
      newScript.textContent = originalScript.textContent;
    }
    if (originalScript.async) {
      newScript.async = true;
    }
    if (originalScript.defer) {
      newScript.defer = true;
    }
    if (originalScript.nonce) {
      newScript.nonce = originalScript.nonce;
    }
    if (originalScript.crossOrigin) {
      newScript.crossOrigin = originalScript.crossOrigin;
    }

    // Insert after the original (preserves source-order intent for
    // tracking scripts that expect to run in document order). Fall
    // back to <head>/<body> if the original has been detached since
    // registration (rare but possible during framework reconciliation).
    const insertAfter = originalScript.nextSibling;
    const parent = originalScript.parentNode;
    if (parent) {
      if (insertAfter) {
        parent.insertBefore(newScript, insertAfter);
      } else {
        parent.appendChild(newScript);
      }
    } else {
      const target = document.head || document.body;
      if (target) {
        target.appendChild(newScript);
      }
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
    this.scripts.clear();
  }
}
