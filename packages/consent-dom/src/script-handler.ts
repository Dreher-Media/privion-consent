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

  private onRevoke: (() => void) | null;

  /**
   * @param onRevoke - called once when consent for a script that already
   *   ran is withdrawn. A script cannot be un-run, so the DOM adapter
   *   reloads the page here by default (see `reloadOnRevoke`).
   */
  constructor(
    consent: PrivionConsent,
    mode: CategoryMatchMode = 'any',
    onRevoke: (() => void) | null = null,
  ) {
    this.consent = consent;
    this.mode = mode;
    this.onRevoke = onRevoke;
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
    let revoked = false;
    for (const [script, data] of this.scripts.entries()) {
      const allowed = areCategoriesAllowed(data.categories, state, this.mode);
      if (!data.activated && allowed) {
        this.activateScript(script);
      } else if (data.activated && !allowed) {
        revoked = true;
      }
    }
    if (revoked && this.onRevoke) {
      const onRevoke = this.onRevoke;
      // Fire once: after a reload the handler is gone anyway, and a host
      // that passed its own callback should not get it per script.
      this.onRevoke = null;
      onRevoke();
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

    // Carry every attribute over (src, integrity, crossorigin,
    // referrerpolicy, nonce, id, data-*, …) except the ones that only
    // exist for Privion. `privion-type` sets the real type, e.g.
    // `<script type="privion" privion-type="module">`.
    for (const attr of Array.from(originalScript.attributes)) {
      if (attr.name === 'type' || attr.name.startsWith('privion-')) {
        continue;
      }
      newScript.setAttribute(attr.name, attr.value);
    }
    // An id must stay unique: it moves to the script that actually runs.
    if (originalScript.id) {
      originalScript.removeAttribute('id');
    }
    const realType = originalScript.getAttribute('privion-type');
    if (realType) {
      newScript.type = realType;
    }
    // `nonce` is hidden from getAttribute after parsing; copy the property.
    if (originalScript.nonce) {
      newScript.nonce = originalScript.nonce;
    }
    // Dynamically inserted scripts default to async. Keep the author's
    // intent: without `async` they run in insertion order.
    newScript.async = originalScript.hasAttribute('async');
    if (!originalScript.src && originalScript.textContent) {
      newScript.textContent = originalScript.textContent;
    }

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
