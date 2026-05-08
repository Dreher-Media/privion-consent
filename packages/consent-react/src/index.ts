// Context and hooks
export { ConsentProvider, useConsent, useConsentI18n } from './context.js';
export { useConsentCategory } from './hooks.js';

// Components
export { ConsentBanner, ConsentPreferences } from './components.js';
export { ConsentErrorBoundary } from './ConsentErrorBoundary.js';

// i18n
export { enLocale, deLocale, frLocale, esLocale, mergeI18n, type ConsentI18n } from './i18n.js';

// Re-export types from core
export type {
  ConsentStatus,
  ConsentSource,
  ConsentState,
  ConsentEvent,
  ConsentCategoryConfig,
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  BackendSyncError,
  PrivionConsentConfig,
  RegionMode,
} from '@privion-consent/core';
