// Context and hooks
export { ConsentProvider, useConsent } from './context.js';
export { useConsentCategory } from './hooks.js';

// Components
export { ConsentBanner, ConsentPreferences } from './components.js';

// Re-export types from core
export type {
  ConsentStatus,
  ConsentState,
  ConsentEvent,
  ConsentCategoryConfig,
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  PrivionConsentConfig,
} from '@privion-consent/core';
