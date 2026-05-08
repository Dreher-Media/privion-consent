// Server-side helpers
export {
  resolveRegion,
  DEFAULT_REGION_HEADERS,
  DEFAULT_IGNORED_REGION_VALUES,
  type ResolveRegionOptions,
} from './server.js';

// Client boot helpers
export { bootPrivion, readSerializedConfig } from './boot.js';

// Re-export commonly used types so consumers don't also have to depend
// on @privion-consent/core directly for typing the integration config.
export type {
  PrivionConsent,
  PrivionConsentConfig,
  ConsentState,
  ConsentStatus,
  ConsentSource,
  ConsentEvent,
  ConsentCategoryConfig,
  ConsentMigration,
  RegionMode,
  StorageConfig,
  BackendSyncConfig,
  BackendSyncError,
  GoogleConsentMapping,
} from '@privion-consent/core';
