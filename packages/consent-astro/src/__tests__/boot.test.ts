import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootPrivion, readSerializedConfig } from '../boot.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

const config: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'denied' },
  ],
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  delete (window as { __privionConsent?: unknown }).__privionConsent;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('bootPrivion', () => {
  it('creates the engine, runs the DOM adapter, and exposes window.__privionConsent', () => {
    document.body.innerHTML = `
      <div privion-banner></div>
      <button privion-accept-all></button>
    `;

    const consent = bootPrivion(config);

    expect(consent).toBeDefined();
    expect(window.__privionConsent).toBe(consent);
    expect(consent.getState().categories.necessary).toBe('granted');
  });

  it('drives the SSR-rendered banner by toggling its hidden attribute', () => {
    document.body.innerHTML = `<div privion-banner hidden></div>`;
    const banner = document.querySelector<HTMLElement>('[privion-banner]')!;
    expect(banner.hidden).toBe(true);

    const consent = bootPrivion(config);
    // Initial visibility update is deferred 10ms inside the dom handler.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // No decision yet → banner becomes visible.
        expect(banner.hidden).toBe(false);
        consent.acceptAll();
        // After acceptAll, userDecided=true → hidden again.
        expect(banner.hidden).toBe(true);
        resolve();
      }, 30);
    });
  });
});

describe('readSerializedConfig', () => {
  it('parses the JSON config block', () => {
    document.body.innerHTML = `<script id="privion-config" type="application/json">${JSON.stringify(config)}</script>`;
    expect(readSerializedConfig()).toEqual(config);
  });

  it('respects a custom element id', () => {
    document.body.innerHTML = `<script id="my-config" type="application/json">${JSON.stringify(config)}</script>`;
    expect(readSerializedConfig('my-config')).toEqual(config);
  });

  it('returns null when the element is missing', () => {
    expect(readSerializedConfig()).toBeNull();
  });

  it('returns null and logs a warning on malformed JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    document.body.innerHTML = `<script id="privion-config" type="application/json">{not json</script>`;
    expect(readSerializedConfig()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
