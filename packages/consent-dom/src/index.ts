import type { PrivionConsent } from '@privion-consent/core';
import type { PrivionDomOptions } from './types.js';
import { ScriptHandler } from './script-handler.js';
import { IframeHandler } from './iframe-handler.js';
import { VisibilityHandler } from './visibility-handler.js';
import { UIHandler } from './ui-handler.js';

/**
 * Initialize Privion DOM adapter
 */
export function initPrivionDom(consent: PrivionConsent, options: PrivionDomOptions = {}): void {
  const root: HTMLElement | Document = options.root || document;
  const categoryMatchMode = options.categoryMatchMode || 'any';

  // Initialize handlers
  const scriptHandler = new ScriptHandler(consent, categoryMatchMode);
  const iframeHandler = new IframeHandler(consent, categoryMatchMode);
  const visibilityHandler = new VisibilityHandler(consent);
  const uiHandler = new UIHandler(consent);

  // Initialize all handlers
  scriptHandler.init(root);
  iframeHandler.init(root);
  visibilityHandler.init(root);
  uiHandler.init(root);

  // Store handlers on consent instance for potential cleanup
  (consent as any)._privionDomHandlers = {
    scriptHandler,
    iframeHandler,
    visibilityHandler,
    uiHandler,
  };
}

// Export types
export type { PrivionDomOptions, CategoryMatchMode } from './types.js';
