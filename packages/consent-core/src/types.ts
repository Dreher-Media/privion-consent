/**
 * Consent Status - Three possible states for a consent category
 */
export type ConsentStatus = 'granted' | 'denied' | 'unknown';

/**
 * Google Consent Mode v2 mapping
 */
export interface GoogleConsentMapping {
  ad_storage: ConsentStatus;
  analytics_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
}

/**
 * Configuration for a single consent category
 */
export interface ConsentCategoryConfig {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultStatus?: ConsentStatus;
  googleMapping?: Partial<GoogleConsentMapping>;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  key?: string;
  type?: 'cookie' | 'localStorage';
  cookieOptions?: {
    path?: string;
    domain?: string;
    maxAgeDays?: number;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
  };
}

/**
 * Backend sync configuration (optional).
 *
 * When set, the engine POSTs the consent state to `endpoint` after
 * every state change. Failures are retried with exponential backoff
 * for transient errors (network, 5xx); 4xx responses are treated as
 * permanent and reported via `onSyncError` without retrying.
 */
export interface BackendSyncConfig {
  endpoint: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  includeIp?: boolean;
  includeUserAgent?: boolean;
  /**
   * Maximum number of retry attempts for transient failures.
   * Defaults to `3` (so up to 4 total attempts: 1 initial + 3 retries).
   * Set to `0` to disable retries.
   */
  retries?: number;
  /**
   * Base delay in milliseconds before the first retry. Doubles each
   * subsequent attempt (200, 400, 800, …). Defaults to `200`.
   */
  retryBaseDelayMs?: number;
  /**
   * Reshape the consent state into the request body before
   * serialization. Useful when the backend expects a different
   * envelope or additional fields.
   */
  payloadTransform?: (state: ConsentState) => unknown;
  /**
   * Called for every sync failure (including each retried attempt).
   * Receives a structured error object describing what went wrong.
   */
  onSyncError?: (error: BackendSyncError) => void;
}

/**
 * Structured failure reported via `BackendSyncConfig.onSyncError`.
 */
export interface BackendSyncError {
  endpoint: string;
  attempt: number;
  totalAttempts: number;
  cause: 'network' | 'http';
  status?: number;
  statusText?: string;
  error?: unknown;
}

/**
 * Main configuration for Privion Consent.
 *
 * `storage` accepts either a built-in selector (`StorageConfig`) or a
 * custom `ConsentStorageAdapter` instance for plugging in alternative
 * backends (IndexedDB, server-side, React Native AsyncStorage, …).
 */
export interface PrivionConsentConfig {
  version: number;
  categories: ConsentCategoryConfig[];
  defaultRegionMode?: 'opt-in' | 'opt-out';
  storage?: StorageConfig | import('./storage.js').ConsentStorageAdapter;
  i18n?: Record<string, Record<string, string>>;
  googleConsentMode?: {
    mode: 'basic' | 'advanced';
  };
  backendSync?: BackendSyncConfig;
}

/**
 * Source of the most recent state change.
 *
 * - `banner`: user clicked Accept all / Reject all on the banner.
 * - `preferences`: user saved choices in the preferences modal.
 * - `api`: programmatic change via `setCategory` / `setMany` without an
 *   explicit source (e.g. an integration sets a category from code).
 */
export type ConsentSource = 'banner' | 'preferences' | 'api';

/**
 * Current consent state.
 *
 * `userDecided` tracks whether the user has explicitly made a choice via
 * the banner or preferences UI. Programmatic API calls do NOT flip this
 * flag — that way the banner stays correctly hidden after a real choice
 * and stays visible while a host app pre-seeds categories from code.
 */
export interface ConsentState {
  categories: Record<string, ConsentStatus>;
  updatedAt: string; // ISO timestamp
  version: number;
  source: ConsentSource;
  userDecided: boolean;
}

/**
 * Consent event types
 */
export type ConsentEvent = 'ready' | 'update' | 'accept_all' | 'reject_all' | 'reset';
