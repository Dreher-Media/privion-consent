// Types
export type {
  ConsentStatus,
  ConsentState,
  ConsentEvent,
  ConsentCategoryConfig,
  GoogleConsentMapping,
  StorageConfig,
  BackendSyncConfig,
  PrivionConsentConfig
} from './types.js';

// Core engine
export { PrivionConsent, createPrivionConsent } from './consent-engine.js';

// Storage
export { ConsentStorage } from './storage.js';

// Google Consent Mode
export { computeGoogleConsentMode, syncGoogleConsentMode } from './google-consent-mode.js';
