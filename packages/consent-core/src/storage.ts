import type { ConsentState, StorageConfig } from './types.js';

const DEFAULT_STORAGE_KEY = 'privion-consent';
const DEFAULT_STORAGE_TYPE = 'cookie';

/**
 * Cookie utility functions
 */
function setCookie(
  name: string,
  value: string,
  options: StorageConfig['cookieOptions'] = {},
): void {
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

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
    }
  }
  return null;
}

function deleteCookie(name: string, options: StorageConfig['cookieOptions'] = {}): void {
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
 * Storage adapter interface
 */
export class ConsentStorage {
  private key: string;
  private type: 'cookie' | 'localStorage';
  private cookieOptions: StorageConfig['cookieOptions'];

  constructor(config: StorageConfig = {}) {
    this.key = config.key || DEFAULT_STORAGE_KEY;
    this.type = config.type || DEFAULT_STORAGE_TYPE;
    this.cookieOptions = config.cookieOptions || {};
  }

  /**
   * Save consent state to storage
   */
  save(state: ConsentState): void {
    const serialized = JSON.stringify(state);

    if (this.type === 'cookie') {
      setCookie(this.key, serialized, this.cookieOptions);
    } else {
      try {
        localStorage.setItem(this.key, serialized);
      } catch (e) {
        console.warn('Failed to save consent to localStorage:', e);
      }
    }
  }

  /**
   * Load consent state from storage
   */
  load(): ConsentState | null {
    let data: string | null = null;

    if (this.type === 'cookie') {
      data = getCookie(this.key);
    } else {
      try {
        data = localStorage.getItem(this.key);
      } catch (e) {
        console.warn('Failed to load consent from localStorage:', e);
      }
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

  /**
   * Clear stored consent
   */
  clear(): void {
    if (this.type === 'cookie') {
      deleteCookie(this.key, this.cookieOptions);
    } else {
      try {
        localStorage.removeItem(this.key);
      } catch (e) {
        console.warn('Failed to clear consent from localStorage:', e);
      }
    }
  }
}
