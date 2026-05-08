// Types
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
  ConsentMigration,
  PrivionConsentConfig,
  RegionMode,
} from './types.js';

// Core engine
export { PrivionConsent, createPrivionConsent, resolveRegionMode } from './consent-engine.js';

// Storage
export {
  CookieStorage,
  LocalStorageAdapter,
  ConsentStorage,
  isStorageAdapter,
  resolveStorage,
  type ConsentStorageAdapter,
} from './storage.js';

// Google Consent Mode
export { computeGoogleConsentMode, syncGoogleConsentMode } from './google-consent-mode.js';
