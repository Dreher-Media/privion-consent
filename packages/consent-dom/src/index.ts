import type { PrivionConsent } from '@privion-consent/core';
import type { PrivionDomOptions } from './types.js';
import { ScriptHandler } from './script-handler.js';
import { IframeHandler } from './iframe-handler.js';
import { VisibilityHandler } from './visibility-handler.js';
import { UIHandler } from './ui-handler.js';

/**
 * Handle returned from `initPrivionDom`. Call `destroy()` to tear down
 * every handler — disconnects MutationObservers, unsubscribes consent
 * listeners, and clears tracked element maps. Useful for SPAs that
 * dispose of consent instances on route change, and for tests that
 * need a clean slate between cases.
 */
export interface PrivionDomHandle {
  destroy(): void;
}

/**
 * Initialize Privion DOM adapter
 */
export function initPrivionDom(
  consent: PrivionConsent,
  options: PrivionDomOptions = {},
): PrivionDomHandle {
  const root: HTMLElement | Document = options.root || document;
  const categoryMatchMode = options.categoryMatchMode || 'any';

  const scriptHandler = new ScriptHandler(consent, categoryMatchMode);
  const iframeHandler = new IframeHandler(consent, categoryMatchMode);
  const visibilityHandler = new VisibilityHandler(consent);
  const uiHandler = new UIHandler(consent);

  scriptHandler.init(root);
  iframeHandler.init(root);
  visibilityHandler.init(root);
  uiHandler.init(root);

  const handle: PrivionDomHandle = {
    destroy() {
      scriptHandler.destroy();
      iframeHandler.destroy();
      visibilityHandler.destroy();
      uiHandler.destroy();
    },
  };

  // Stash on the consent instance for legacy back-compat — keeps
  // existing host-app introspection working.
  (consent as unknown as { _privionDomHandlers?: unknown })._privionDomHandlers = {
    scriptHandler,
    iframeHandler,
    visibilityHandler,
    uiHandler,
  };

  return handle;
}

// Export types
export type { PrivionDomOptions, CategoryMatchMode } from './types.js';
