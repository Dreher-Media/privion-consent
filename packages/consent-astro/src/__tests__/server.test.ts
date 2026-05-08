import { describe, expect, it } from 'vitest';
import { DEFAULT_IGNORED_REGION_VALUES, DEFAULT_REGION_HEADERS, resolveRegion } from '../server.js';

describe('resolveRegion', () => {
  it('reads cf-ipcountry from a Headers instance', () => {
    const headers = new Headers({ 'cf-ipcountry': 'DE' });
    expect(resolveRegion(headers)).toBe('DE');
  });

  it('falls through to the next configured header when the first is missing', () => {
    const headers = new Headers({ 'x-vercel-ip-country': 'US' });
    expect(resolveRegion(headers)).toBe('US');
  });

  it('uppercases the result', () => {
    const headers = new Headers({ 'cf-ipcountry': 'fr' });
    expect(resolveRegion(headers)).toBe('FR');
  });

  it('ignores Cloudflare sentinels (XX, T1)', () => {
    const headers = new Headers({ 'cf-ipcountry': 'XX', 'x-vercel-ip-country': 'CA' });
    expect(resolveRegion(headers)).toBe('CA');
  });

  it('returns undefined when nothing matches', () => {
    expect(resolveRegion(new Headers())).toBeUndefined();
  });

  it('accepts a plain object as headers (case-insensitive lookup)', () => {
    expect(resolveRegion({ 'CF-IPCountry': 'DE' } as Record<string, string>)).toBe('DE');
  });

  it('respects a custom headers list', () => {
    const headers = new Headers({ 'cf-ipcountry': 'DE', 'x-region': 'US' });
    expect(resolveRegion(headers, { headers: ['x-region', 'cf-ipcountry'] })).toBe('US');
  });

  it('respects a custom ignoreValues list', () => {
    const headers = new Headers({ 'cf-ipcountry': 'EU', 'x-vercel-ip-country': 'DE' });
    expect(resolveRegion(headers, { ignoreValues: ['EU'] })).toBe('DE');
  });

  it('exposes the default constants for documentation', () => {
    expect(DEFAULT_REGION_HEADERS).toContain('cf-ipcountry');
    expect(DEFAULT_IGNORED_REGION_VALUES).toContain('XX');
  });
});
