// @ts-check
import { defineConfig } from 'astro/config';

// SSR via the node adapter would be wired here for a real deployment;
// the example runs as a static site so we leave it default. The
// `resolveRegion` helper in @privion-consent/astro/server still works
// inside `Astro.request.headers` when this is deployed under a CDN
// that injects `cf-ipcountry` (Cloudflare, Vercel Edge, …).
export default defineConfig({
  output: 'static',
});
