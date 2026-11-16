import type { PrivionConsent } from '@privion-consent/core';

export type CategoryMatchMode = 'any' | 'all';

export interface PrivionDomOptions {
  root?: HTMLElement | Document;
  categoryMatchMode?: CategoryMatchMode;
  /**
   * Reload the page when consent is withdrawn for a script that already
   * ran. A running script cannot be stopped; a reload is the only way to
   * make the withdrawal take effect. Default: `true`.
   */
  reloadOnRevoke?: boolean;
}
