import {
  ConsentBanner,
  ConsentPreferences,
  ConsentProvider,
  deLocale,
  enLocale,
  esLocale,
  frLocale,
  useConsent,
  useConsentCategory,
  type ConsentI18n,
} from '@privion-consent/react';
import type { PrivionConsentConfig } from '@privion-consent/core';
import { useState } from 'react';

const consentConfig: PrivionConsentConfig = {
  version: 1,
  // Static demo: pretend we resolved the user's region server-side. In
  // a real Vite SPA you'd ship this region from a small bootstrap API
  // call before constructing the engine, or just default to 'opt-in'
  // and prompt every visitor.
  region: 'DE',
  regionRules: {
    DE: { mode: 'opt-in' },
    AT: { mode: 'opt-in' },
    FR: { mode: 'opt-in' },
    GB: { mode: 'opt-in' },
    CH: { mode: 'opt-in' },
  },
  defaultRegionMode: 'opt-out',
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', description: 'Helps us understand site usage.' },
    { id: 'marketing', label: 'Marketing', description: 'Personalized ads and remarketing.' },
  ],
  storage: { type: 'localStorage' },
  googleConsentMode: { mode: 'advanced' },
};

const localesByCode: Record<string, ConsentI18n> = {
  en: enLocale,
  de: deLocale,
  fr: frLocale,
  es: esLocale,
};

export function App() {
  const [locale, setLocale] = useState<keyof typeof localesByCode>('en');
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');

  // Apply the theme override on the html element so the styles.css
  // tokens pick it up. (CSS targets `[data-privion-theme]`.)
  if (typeof document !== 'undefined') {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-privion-theme');
    } else {
      document.documentElement.setAttribute('data-privion-theme', theme);
    }
  }

  return (
    <ConsentProvider config={consentConfig} i18n={localesByCode[locale]}>
      <main>
        <h1>Privion Consent — Vite + React</h1>
        <p>
          The banner appears until you make a choice. Try the buttons below to swap the locale and
          theme; the bundled components react in real time.
        </p>

        <fieldset>
          <legend>Locale</legend>
          {(['en', 'de', 'fr', 'es'] as const).map((code) => (
            <label key={code}>
              <input
                type="radio"
                name="locale"
                value={code}
                checked={locale === code}
                onChange={() => setLocale(code)}
              />
              {code.toUpperCase()}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Theme</legend>
          {(['auto', 'light', 'dark'] as const).map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={() => setTheme(t)}
              />
              {t}
            </label>
          ))}
        </fieldset>

        <Status />
      </main>

      <ConsentBanner />
    </ConsentProvider>
  );
}

function Status() {
  const { state, consent } = useConsent();
  const analytics = useConsentCategory('analytics');

  return (
    <section>
      <h2>State</h2>
      <pre>{JSON.stringify(state, null, 2)}</pre>

      <p>
        Programmatic toggle (uses <code>useConsentCategory.set</code> with default{' '}
        <code>'api'</code> source — does NOT flip <code>userDecided</code>):
      </p>
      <p>
        <button
          type="button"
          onClick={() => analytics.set(analytics.status === 'granted' ? 'denied' : 'granted')}
        >
          Toggle analytics ({analytics.status})
        </button>
        <button type="button" onClick={() => consent.reset()}>
          Reset stored consent
        </button>
      </p>

      {!state.userDecided && <ConsentPreferences />}
    </section>
  );
}
