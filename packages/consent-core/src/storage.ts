import type { ConsentState, StorageConfig } from './types.js';

const DEFAULT_STORAGE_KEY = 'privion-consent';
const DEFAULT_STORAGE_TYPE = 'cookie';

/**
 * Pluggable storage backend for consent state.
 *
 * Implement this interface to plug a custom backend (e.g. IndexedDB,
 * a server-side store, React Native's AsyncStorage). The interface is
 * intentionally synchronous in v1 because the engine's first-load
 * banner-show decision needs the persisted state in the constructor;
 * adapters that wrap async backends should buffer the state in memory
 * and flush asynchronously inside `save`.
 */
export interface ConsentStorageAdapter {
  save(state: ConsentState): void;
  load(): ConsentState | null;
  clear(): void;
}

type CookieOptions = NonNullable<StorageConfig['cookieOptions']>;

function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  const { path = '/', domain, maxAgeDays = 365, secure = true, sameSite = 'Lax' } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookie += `; path=${path}`;
  cookie += `; max-age=${maxAgeDays * 24 * 60 * 60}`;
  cookie += `; SameSite=${sameSite}`;

  if (domain) {
    cookie += `; domain=${domain}`;
  }

  if (secure) {
    cookie += '; Secure';
  }

  document.cookie = cookie;
}

function getCookie(name: string): string | null {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  return null;
}

function deleteCookie(name: string, options: CookieOptions = {}): void {
  const { path = '/', domain } = options;
  let cookie = `${encodeURIComponent(name)}=`;
  cookie += `; path=${path}`;
  cookie += `; max-age=0`;
  cookie += `; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

  if (domain) {
    cookie += `; domain=${domain}`;
  }

  document.cookie = cookie;
}

/**
 * Cookie-backed storage adapter.
 */
export class CookieStorage implements ConsentStorageAdapter {
  private readonly key: string;
  private readonly cookieOptions: CookieOptions;

  constructor(options?: { key?: string; cookieOptions?: CookieOptions }) {
    this.key = options?.key ?? DEFAULT_STORAGE_KEY;
    this.cookieOptions = options?.cookieOptions ?? {};
  }

  save(state: ConsentState): void {
    setCookie(this.key, JSON.stringify(state), this.cookieOptions);
  }

  load(): ConsentState | null {
    const data = getCookie(this.key);
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data) as ConsentState;
    } catch (e) {
      console.warn('Failed to parse stored consent:', e);
      return null;
    }
  }

  clear(): void {
    deleteCookie(this.key, this.cookieOptions);
  }
}

/**
 * localStorage-backed storage adapter.
 */
export class LocalStorageAdapter implements ConsentStorageAdapter {
  private readonly key: string;

  constructor(options?: { key?: string }) {
    this.key = options?.key ?? DEFAULT_STORAGE_KEY;
  }

  save(state: ConsentState): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save consent to localStorage:', e);
    }
  }

  load(): ConsentState | null {
    let data: string | null = null;
    try {
      data = localStorage.getItem(this.key);
    } catch (e) {
      console.warn('Failed to load consent from localStorage:', e);
      return null;
    }

    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data) as ConsentState;
    } catch (e) {
      console.warn('Failed to parse stored consent:', e);
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch (e) {
      console.warn('Failed to clear consent from localStorage:', e);
    }
  }
}

/**
 * Type guard to distinguish a custom adapter from a built-in storage
 * config object.
 */
export function isStorageAdapter(value: unknown): value is ConsentStorageAdapter {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as ConsentStorageAdapter).save === 'function' &&
    typeof (value as ConsentStorageAdapter).load === 'function' &&
    typeof (value as ConsentStorageAdapter).clear === 'function'
  );
}

/**
 * Resolve the engine's storage backend from the user's config:
 *
 * - If they passed a `ConsentStorageAdapter` directly, use it.
 * - Otherwise treat the input as a `StorageConfig` and instantiate
 *   the matching built-in adapter (cookie by default).
 */
export function resolveStorage(
  input: StorageConfig | ConsentStorageAdapter | undefined,
): ConsentStorageAdapter {
  if (isStorageAdapter(input)) {
    return input;
  }
  const config = input ?? {};
  const type = config.type ?? DEFAULT_STORAGE_TYPE;
  // Build the options object with conditional spreads so missing keys
  // stay omitted — `exactOptionalPropertyTypes: true` rejects an
  // explicit `undefined` for an optional `key?: string` parameter.
  if (type === 'localStorage') {
    return new LocalStorageAdapter(config.key !== undefined ? { key: config.key } : undefined);
  }
  return new CookieStorage({
    ...(config.key !== undefined ? { key: config.key } : {}),
    ...(config.cookieOptions !== undefined ? { cookieOptions: config.cookieOptions } : {}),
  });
}

/**
 * @deprecated Use `resolveStorage(config)` and the per-backend classes
 * (`CookieStorage`, `LocalStorageAdapter`) directly. Preserved as a
 * thin wrapper for any external callers that constructed it directly.
 */
export class ConsentStorage implements ConsentStorageAdapter {
  private readonly inner: ConsentStorageAdapter;

  constructor(config: StorageConfig = {}) {
    this.inner = resolveStorage(config);
  }

  save(state: ConsentState): void {
    this.inner.save(state);
  }
  load(): ConsentState | null {
    return this.inner.load();
  }
  clear(): void {
    this.inner.clear();
  }
}
