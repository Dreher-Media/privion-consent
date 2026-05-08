/**
 * Server-side helpers for resolving the user's region inside an Astro
 * middleware, page frontmatter, or any other request-scoped context.
 *
 * The library deliberately doesn't ship a geo database. These helpers
 * read the region out of an HTTP header that an upstream CDN / GeoIP
 * service has already populated. Common providers:
 *
 *  - Cloudflare:           `cf-ipcountry`
 *  - Vercel:               `x-vercel-ip-country`
 *  - Netlify:              `x-country`
 *  - Akamai EdgeScape:     `x-akamai-edgescape`
 *
 * If your provider isn't listed, pass the header name explicitly.
 */

/**
 * Default ordered list of headers checked by `resolveRegion`.
 *
 * The first non-empty value wins. The order prefers Cloudflare because
 * it's the most common in this stack, falling through to other major
 * CDN providers.
 */
export const DEFAULT_REGION_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-country',
  'x-appengine-country',
];

export interface ResolveRegionOptions {
  /**
   * Custom header order (overrides the default list). Header names are
   * matched case-insensitively because Headers normalizes them anyway.
   */
  headers?: string[];
  /**
   * Treat values matching this set as "unknown" and fall through to
   * the next header. Useful for filtering out CDN sentinels like
   * Cloudflare's `XX` (unknown) or `T1` (Tor exit node).
   */
  ignoreValues?: string[];
}

/**
 * Default sentinel values rejected by `resolveRegion` — these are
 * what major CDNs send when they couldn't classify the request, and
 * should fall through to the next header rather than be treated as
 * a real country.
 */
export const DEFAULT_IGNORED_REGION_VALUES = ['XX', 'T1'];

/**
 * Resolve the user's region from request headers.
 *
 * @returns The first non-empty, non-ignored region code (uppercase),
 *   or `undefined` if none of the configured headers carry a value.
 */
export function resolveRegion(
  requestHeaders: Headers | Record<string, string | undefined>,
  options: ResolveRegionOptions = {},
): string | undefined {
  const headerNames = options.headers ?? DEFAULT_REGION_HEADERS;
  const ignored = new Set(
    (options.ignoreValues ?? DEFAULT_IGNORED_REGION_VALUES).map((v) => v.toUpperCase()),
  );

  for (const name of headerNames) {
    const raw = readHeader(requestHeaders, name);
    if (!raw) continue;
    const upper = raw.trim().toUpperCase();
    if (!upper || ignored.has(upper)) continue;
    return upper;
  }
  return undefined;
}

function readHeader(
  headers: Headers | Record<string, string | undefined>,
  name: string,
): string | undefined {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  // Plain-object fallback (used by some test helpers / non-Fetch envs).
  // HTTP header names are case-insensitive so we have to scan keys
  // rather than rely on a single normalization.
  const target = name.toLowerCase();
  const dict = headers as Record<string, string | undefined>;
  for (const key of Object.keys(dict)) {
    if (key.toLowerCase() === target) {
      return dict[key];
    }
  }
  return undefined;
}
