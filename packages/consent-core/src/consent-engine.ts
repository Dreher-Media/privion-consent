import type {
  ConsentCategoryConfig,
  ConsentEvent,
  ConsentMigration,
  ConsentSource,
  ConsentState,
  ConsentStatus,
  PrivionConsentConfig,
  RegionMode,
} from './types.js';
import { resolveStorage, type ConsentStorageAdapter } from './storage.js';
import { computeGoogleConsentMode, syncGoogleConsentMode } from './google-consent-mode.js';

type EventHandler = (state: ConsentState) => void;

/**
 * Main Privion Consent engine
 */
export class PrivionConsent {
  private config: PrivionConsentConfig;
  private storage: ConsentStorageAdapter;
  private state: ConsentState;
  private eventHandlers: Map<ConsentEvent, Set<EventHandler>> = new Map();
  private isReady: boolean = false;
  private hasSyncedGoogle: boolean = false;

  constructor(config: PrivionConsentConfig) {
    this.config = config;
    this.storage = resolveStorage(config.storage);

    // Initialize state from storage or defaults
    this.state = this.initializeState();

    // Mark as ready and emit ready event
    this.isReady = true;
    this.emit('ready', this.state);

    // Sync Google Consent Mode on first load
    if (this.config.googleConsentMode) {
      this.syncGoogleConsentMode();
    }
  }

  /**
   * Initialize consent state from storage or defaults
   */
  private initializeState(): ConsentState {
    const stored = this.storage.load();

    if (stored) {
      const target = this.config.version;
      let candidate: ConsentState | null = null;

      if (stored.version === target) {
        candidate = stored;
      } else if (stored.version < target && this.config.migrations?.length) {
        candidate = runMigrations(stored, this.config.migrations, target);
      }

      // Validate that all categories the candidate carries are still
      // declared in the current config. If not, the host either added
      // a migration to clean up or hadn't — either way the safe move
      // is to fall back to defaults rather than carry orphaned ids.
      if (
        candidate &&
        Object.keys(candidate.categories).every((id) =>
          this.config.categories.some((cat) => cat.id === id),
        )
      ) {
        // Migrate state from older versions that didn't carry `userDecided`:
        // a stored state from `banner`/`preferences` implies the user had
        // already decided; `api` is treated as undecided.
        return {
          ...candidate,
          userDecided: candidate.userDecided ?? candidate.source !== 'api',
        };
      }
    }

    // Build initial state from config
    const regionMode = resolveRegionMode(this.config);
    const fallback: ConsentStatus = regionMode === 'opt-out' ? 'granted' : 'unknown';
    const categories: Record<string, ConsentStatus> = {};

    for (const category of this.config.categories) {
      if (category.required) {
        categories[category.id] = 'granted';
      } else {
        // Per-category defaultStatus always wins over regional defaults so
        // host apps can pin specific categories regardless of region.
        categories[category.id] = category.defaultStatus ?? fallback;
      }
    }

    return {
      categories,
      updatedAt: new Date().toISOString(),
      version: this.config.version,
      source: 'api',
      userDecided: false,
    };
  }

  /**
   * Get current consent state
   */
  getState(): ConsentState {
    return { ...this.state };
  }

  /**
   * Get configuration
   */
  getConfig(): PrivionConsentConfig {
    return { ...this.config };
  }

  /**
   * Get category config by ID
   */
  getCategoryConfig(id: string): ConsentCategoryConfig | undefined {
    return this.config.categories.find((cat) => cat.id === id);
  }

  /**
   * Set a single category's status.
   *
   * @param source - declares why this change was made. Pass `banner` or
   *   `preferences` from UI handlers to mark the state as user-decided;
   *   omit (defaults to `api`) for programmatic changes that should not
   *   dismiss the banner.
   */
  setCategory(id: string, status: ConsentStatus, source: ConsentSource = 'api'): void {
    const category = this.config.categories.find((cat) => cat.id === id);
    if (!category) {
      console.warn(`Category "${id}" not found in config`);
      return;
    }

    // Required categories cannot be denied
    if (category.required && status === 'denied') {
      console.warn(`Category "${id}" is required and cannot be denied`);
      return;
    }

    this.applyChange(() => {
      this.state.categories[id] = status;
    }, source);
  }

  /**
   * Set multiple categories at once.
   *
   * @param source - same semantics as `setCategory`'s `source` argument.
   */
  setMany(updates: Record<string, ConsentStatus>, source: ConsentSource = 'api'): void {
    let hasChanges = false;

    this.applyChange(() => {
      for (const [id, status] of Object.entries(updates)) {
        const category = this.config.categories.find((cat) => cat.id === id);
        if (!category) {
          console.warn(`Category "${id}" not found in config`);
          continue;
        }

        // Required categories cannot be denied
        if (category.required && status === 'denied') {
          continue;
        }

        if (this.state.categories[id] !== status) {
          this.state.categories[id] = status;
          hasChanges = true;
        }
      }
      return hasChanges;
    }, source);
  }

  /**
   * Apply a state mutation, then emit `update` and run side effects if the
   * mutation reported changes (or always, when the mutator returns `void`).
   *
   * Centralizing this prevents the foot-gun where callers mutated
   * `state.source` after `emit('update', ...)` had already fired with the
   * wrong source.
   */
  private applyChange(mutate: () => boolean | void, source: ConsentSource): void {
    const result = mutate();
    const changed = result === undefined ? true : result;
    if (!changed) {
      return;
    }

    this.state.updatedAt = new Date().toISOString();
    this.state.source = source;
    if (source === 'banner' || source === 'preferences') {
      this.state.userDecided = true;
    }

    this.persist();
    this.emit('update', this.state);

    if (this.config.backendSync) {
      this.syncToBackend();
    }
    if (this.config.googleConsentMode) {
      this.syncGoogleConsentMode();
    }
  }

  /**
   * Accept all non-required categories.
   *
   * Bypasses the change-detection guard so that a user clicking "Accept all"
   * is always recorded as a decision (source='banner', userDecided=true)
   * even when the categories were already in the granted state.
   */
  acceptAll(): void {
    this.applyChange(() => {
      for (const category of this.config.categories) {
        if (!category.required) {
          this.state.categories[category.id] = 'granted';
        }
      }
      return true;
    }, 'banner');
    this.emit('accept_all', this.state);
  }

  /**
   * Reject all non-required categories.
   *
   * Always records the user decision — see `acceptAll` for rationale.
   */
  rejectAll(): void {
    this.applyChange(() => {
      for (const category of this.config.categories) {
        if (!category.required) {
          this.state.categories[category.id] = 'denied';
        }
      }
      return true;
    }, 'banner');
    this.emit('reject_all', this.state);
  }

  /**
   * Reset consent to initial state
   */
  reset(): void {
    this.storage.clear();
    this.state = this.initializeState();
    this.hasSyncedGoogle = false;
    this.persist();
    this.emit('reset', this.state);

    // Sync Google Consent Mode
    if (this.config.googleConsentMode) {
      this.syncGoogleConsentMode();
    }
  }

  /**
   * Subscribe to consent events.
   *
   * `ready` replays: if the engine has already finished its initial
   * state load — including state hydrated from storage for a returning
   * visitor — the handler is invoked immediately (synchronously, before
   * `on` returns) with the current state. `ready` fires inside the
   * constructor, before any consumer could possibly have subscribed;
   * without the replay it is unobservable and consumers are forced to
   * poll `getState()` to learn when hydrated consent becomes readable.
   *
   * All other events fire only on subsequent changes.
   */
  on(event: ConsentEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (event === 'ready' && this.isReady) {
      this.invokeHandler(event, handler, this.getState());
    }

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from consent events
   */
  off(event: ConsentEvent, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(event: ConsentEvent, state: ConsentState): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        this.invokeHandler(event, handler, state);
      });
    }
  }

  /**
   * Invoke a single handler with the engine's error containment: an
   * exception thrown by one listener is logged and must not break the
   * caller or other listeners.
   */
  private invokeHandler(event: ConsentEvent, handler: EventHandler, state: ConsentState): void {
    try {
      handler(state);
    } catch (error) {
      console.error(`Error in consent event handler for "${event}":`, error);
    }
  }

  /**
   * Persist current state to storage
   */
  private persist(): void {
    this.storage.save(this.state);
  }

  /**
   * Sync Google Consent Mode.
   *
   * The first emission is treated as `default` only when no decision is
   * on file yet. Returning visitors with stored consent get `update` on
   * init so their actual choice propagates to gtag/dataLayer immediately
   * — without us first announcing an all-denied default that would
   * conflict with their stored state.
   */
  syncGoogleConsentMode(options?: { mode?: 'basic' | 'advanced' }): void {
    const mode = options?.mode || this.config.googleConsentMode?.mode || 'basic';
    const mapping = computeGoogleConsentMode(this.state, this.config);
    const isFirstLoad = !this.hasSyncedGoogle && !this.state.userDecided;
    syncGoogleConsentMode(mapping, mode, isFirstLoad);
    this.hasSyncedGoogle = true;
  }

  /**
   * POST/PUT the consent state to the configured backend endpoint with
   * retries on transient failures.
   *
   * Retry policy:
   *   - Network failures (fetch throws): retry with exponential backoff.
   *   - HTTP 5xx: retry with exponential backoff.
   *   - HTTP 4xx: treat as permanent (don't retry), still call `onSyncError`.
   *   - HTTP 2xx: success.
   *
   * Each attempt's failure (whether final or not) calls `onSyncError`
   * if provided so the host app can log/observe.
   */
  private async syncToBackend(): Promise<void> {
    const cfg = this.config.backendSync;
    if (!cfg) {
      return;
    }

    const totalAttempts = (cfg.retries ?? 3) + 1;
    const baseDelay = cfg.retryBaseDelayMs ?? 200;
    const payload = this.buildBackendSyncPayload(cfg);
    const url = cfg.endpoint;
    const method = cfg.method ?? 'POST';
    const headers = { 'Content-Type': 'application/json', ...cfg.headers };
    const body = JSON.stringify(payload);

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const response = await fetch(url, { method, headers, body });
        if (response.ok) {
          return;
        }
        const transient = response.status >= 500 && response.status < 600;
        cfg.onSyncError?.({
          endpoint: url,
          attempt,
          totalAttempts,
          cause: 'http',
          status: response.status,
          statusText: response.statusText,
        });
        if (!transient) {
          return; // 4xx — give up immediately
        }
      } catch (error) {
        cfg.onSyncError?.({
          endpoint: url,
          attempt,
          totalAttempts,
          cause: 'network',
          error,
        });
      }

      if (attempt < totalAttempts) {
        await sleep(baseDelay * 2 ** (attempt - 1));
      }
    }
  }

  /**
   * Build the request body for `syncToBackend`, applying
   * `payloadTransform` if provided and otherwise using the default
   * shape (`{ categories, version, updatedAt, userDecided, source,
   * userAgent? }`).
   */
  private buildBackendSyncPayload(cfg: NonNullable<PrivionConsentConfig['backendSync']>): unknown {
    if (cfg.payloadTransform) {
      return cfg.payloadTransform(this.state);
    }

    const payload: Record<string, unknown> = {
      categories: this.state.categories,
      version: this.state.version,
      updatedAt: this.state.updatedAt,
      source: this.state.source,
      userDecided: this.state.userDecided,
    };

    if (cfg.includeUserAgent && typeof navigator !== 'undefined') {
      payload.userAgent = navigator.userAgent;
    }

    return payload;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Walk the migration chain forward from `stored.version` to `target`.
 * Returns `null` if any step is missing, the chain doesn't complete,
 * or a step returns a state with the wrong version (signaling a buggy
 * migration). Callers fall back to defaults on `null`.
 */
function runMigrations(
  stored: ConsentState,
  migrations: ConsentMigration[],
  target: number,
): ConsentState | null {
  let state = stored;
  // Cap the loop so a malformed chain (e.g. a circular pair) can't
  // wedge the engine. The cap is generous; real configs ship a handful
  // of migrations, not hundreds.
  for (let step = 0; step < 100 && state.version < target; step++) {
    const next = migrations.find((m) => m.from === state.version);
    if (!next) {
      return null;
    }
    let migrated: ConsentState;
    try {
      migrated = next.migrate(state);
    } catch (e) {
      console.warn(`Migration ${next.from}→${next.to} threw:`, e);
      return null;
    }
    if (migrated.version !== next.to) {
      console.warn(
        `Migration ${next.from}→${next.to} returned version ${migrated.version}, expected ${next.to}`,
      );
      return null;
    }
    state = migrated;
  }
  return state.version === target ? state : null;
}

/**
 * Resolve the effective region mode for a config:
 *
 * - `regionRules[region]` (case-insensitive) wins if present.
 * - Otherwise `defaultRegionMode` is used.
 * - Otherwise `undefined` — callers fall back to legacy behavior
 *   (`'unknown'` defaults).
 */
export function resolveRegionMode(config: PrivionConsentConfig): RegionMode | undefined {
  const { region, regionRules, defaultRegionMode } = config;
  if (region && regionRules) {
    const upper = region.toUpperCase();
    for (const [key, rule] of Object.entries(regionRules)) {
      if (key.toUpperCase() === upper) {
        return rule.mode;
      }
    }
  }
  return defaultRegionMode;
}

/**
 * Factory function to create a PrivionConsent instance
 */
export function createPrivionConsent(config: PrivionConsentConfig): PrivionConsent {
  return new PrivionConsent(config);
}
