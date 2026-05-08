# Privion Consent — Astro example

Minimal Astro project demonstrating `@privion-consent/astro`:

- `<PrivionScript>` boots the engine in `<head>` with a JSON-serialized config.
- `<ConsentBanner>` and `<ConsentPreferences>` render server-side and the DOM adapter wires them on the client.
- `resolveRegion(Astro.request.headers)` (in `src/layouts/Layout.astro`) reads the user's region from `cf-ipcountry` / `x-vercel-ip-country` / similar CDN headers and feeds it into `regionRules` so the resolved opt-in / opt-out mode is correct on first paint.
- The home page demonstrates `[privion="analytics"]` / `[privion="!analytics"]` conditional visibility.

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter @privion-consent/example-astro dev
```

Then open the URL Astro prints (typically <http://localhost:4321>).

The banner shows on first load; click **Accept all** / **Reject all** / **Customize**, then reload and observe the banner stays hidden because `state.userDecided` is true. Click **Reset stored consent** to clear the decision and reload.

## Region simulation

For local dev there's no CDN injecting `cf-ipcountry`, so `resolveRegion` returns `undefined` and the layout falls back to `defaultRegionMode: 'opt-out'`. To simulate other regions, hit the dev server with `curl`:

```bash
curl -H "cf-ipcountry: DE" http://localhost:4321/   # opt-in (banner forced)
curl -H "cf-ipcountry: US" http://localhost:4321/   # opt-out (analytics granted by default)
```
