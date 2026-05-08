import type { PrivionConsent } from '@privion-consent/core';

export type CategoryMatchMode = 'any' | 'all';

export interface PrivionDomOptions {
  root?: HTMLElement | Document;
  categoryMatchMode?: CategoryMatchMode;
}
