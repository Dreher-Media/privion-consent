# Privion Consent — Vite + React example

Minimal SPA built with Vite that demonstrates `@privion-consent/react`:

- `<ConsentProvider>` wraps the app with the engine, the resolved i18n locale, and `localStorage` persistence.
- `<ConsentBanner>` renders headless until `state.userDecided` flips true.
- `<ConsentPreferences>` is rendered conditionally once the user opens it.
- `useConsentCategory('analytics').set(...)` shows the **programmatic** path (defaults to `source: 'api'`) that intentionally does NOT dismiss the banner — useful for host apps that pre-seed values from server-fetched data.
- The page swaps between bundled English / German / French / Spanish locales and between auto / light / dark themes (the latter via the `data-privion-theme` attribute that `@privion-consent/dom/styles.css` honors).

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter @privion-consent/example-vite-react dev
```

Then open the URL Vite prints (typically <http://localhost:5173>).
