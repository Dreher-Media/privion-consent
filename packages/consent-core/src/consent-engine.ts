import type {
  ConsentState,
  ConsentStatus,
  ConsentEvent,
  PrivionConsentConfig,
  ConsentCategoryConfig,
} from './types.js';
import { ConsentStorage } from './storage.js';
import { computeGoogleConsentMode, syncGoogleConsentMode } from './google-consent-mode.js';

type EventHandler = (state: ConsentState) => void;

/**
 * Main Privion Consent engine
 */
export class PrivionConsent {
  private config: PrivionConsentConfig;
  private storage: ConsentStorage;
  private state: ConsentState;
  private eventHandlers: Map<ConsentEvent, Set<EventHandler>> = new Map();
  private isReady: boolean = false;
  private hasSyncedGoogle: boolean = false;

  constructor(config: PrivionConsentConfig) {
    this.config = config;
    this.storage = new ConsentStorage(config.storage);

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

    // Validate stored state
    if (stored && stored.version === this.config.version) {
      // Validate that all categories exist in config
      const allCategoriesValid = Object.keys(stored.categories).every((id) =>
        this.config.categories.some((cat) => cat.id === id),
      );

      if (allCategoriesValid) {
        return stored;
      }
    }

    // Build initial state from config
    const categories: Record<string, ConsentStatus> = {};

    for (const category of this.config.categories) {
      if (category.required) {
        categories[category.id] = 'granted';
      } else {
        categories[category.id] = category.defaultStatus || 'unknown';
      }
    }

    return {
      categories,
      updatedAt: new Date().toISOString(),
      version: this.config.version,
      source: 'api',
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
   * Set a single category's status
   */
  setCategory(id: string, status: ConsentStatus): void {
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

    this.state.categories[id] = status;
    this.state.updatedAt = new Date().toISOString();
    this.state.source = 'api';

    this.persist();
    this.emit('update', this.state);

    // Sync to backend if configured
    if (this.config.backendSync) {
      this.syncToBackend();
    }

    // Sync Google Consent Mode
    if (this.config.googleConsentMode) {
      this.syncGoogleConsentMode();
    }
  }

  /**
   * Set multiple categories at once
   */
  setMany(updates: Record<string, ConsentStatus>): void {
    let hasChanges = false;

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

    if (hasChanges) {
      this.state.updatedAt = new Date().toISOString();
      this.state.source = 'api';
      this.persist();
      this.emit('update', this.state);

      // Sync to backend if configured
      if (this.config.backendSync) {
        this.syncToBackend();
      }

      // Sync Google Consent Mode
      if (this.config.googleConsentMode) {
        this.syncGoogleConsentMode();
      }
    }
  }

  /**
   * Accept all non-required categories
   */
  acceptAll(): void {
    const updates: Record<string, ConsentStatus> = {};

    for (const category of this.config.categories) {
      if (!category.required) {
        updates[category.id] = 'granted';
      }
    }

    if (Object.keys(updates).length > 0) {
      this.setMany(updates);
      this.state.source = 'banner';
      this.persist();
      this.emit('accept_all', this.state);
    }
  }

  /**
   * Reject all non-required categories
   */
  rejectAll(): void {
    const updates: Record<string, ConsentStatus> = {};

    for (const category of this.config.categories) {
      if (!category.required) {
        updates[category.id] = 'denied';
      }
    }

    if (Object.keys(updates).length > 0) {
      this.setMany(updates);
      this.state.source = 'banner';
      this.persist();
      this.emit('reject_all', this.state);
    }
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
   * Subscribe to consent events
   */
  on(event: ConsentEvent, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

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
        try {
          handler(state);
        } catch (error) {
          console.error(`Error in consent event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Persist current state to storage
   */
  private persist(): void {
    this.storage.save(this.state);
  }

  /**
   * Sync Google Consent Mode
   */
  syncGoogleConsentMode(options?: { mode?: 'basic' | 'advanced' }): void {
    const mode = options?.mode || this.config.googleConsentMode?.mode || 'basic';
    const mapping = computeGoogleConsentMode(this.state, this.config);
    syncGoogleConsentMode(mapping, mode, !this.hasSyncedGoogle);
    this.hasSyncedGoogle = true;
  }

  /**
   * Sync consent to backend (if configured)
   */
  private async syncToBackend(): Promise<void> {
    if (!this.config.backendSync) {
      return;
    }

    const payload: Record<string, any> = {
      categories: this.state.categories,
      version: this.state.version,
      updatedAt: this.state.updatedAt,
    };

    // Add optional fields
    if (this.config.backendSync.includeUserAgent && typeof navigator !== 'undefined') {
      payload.userAgent = navigator.userAgent;
    }

    try {
      const response = await fetch(this.config.backendSync.endpoint, {
        method: this.config.backendSync.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.backendSync.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn('Failed to sync consent to backend:', response.statusText);
      }
    } catch (error) {
      console.warn('Error syncing consent to backend:', error);
    }
  }
}

/**
 * Factory function to create a PrivionConsent instance
 */
export function createPrivionConsent(config: PrivionConsentConfig): PrivionConsent {
  return new PrivionConsent(config);
}
