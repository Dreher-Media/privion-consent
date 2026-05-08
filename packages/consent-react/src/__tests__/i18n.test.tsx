import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  ConsentBanner,
  ConsentPreferences,
  ConsentProvider,
  deLocale,
  frLocale,
  useConsentI18n,
  type ConsentI18n,
} from '../index.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

const config: PrivionConsentConfig = {
  version: 1,
  categories: [
    { id: 'necessary', label: 'Necessary', required: true, defaultStatus: 'granted' },
    { id: 'analytics', label: 'Analytics', defaultStatus: 'unknown' },
  ],
};

beforeEach(() => {
  localStorage.clear();
});

describe('i18n', () => {
  it('renders English defaults when no override is provided', () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(screen.getByText('Accept all')).toBeInTheDocument();
    expect(screen.getByText('Reject all')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
  });

  it('renders the German locale when passed via i18n prop', () => {
    render(
      <ConsentProvider config={config} i18n={deLocale}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(screen.getByText('Alle akzeptieren')).toBeInTheDocument();
    expect(screen.getByText('Alle ablehnen')).toBeInTheDocument();
    expect(screen.getByText('Anpassen')).toBeInTheDocument();
  });

  it('merges a partial override on top of English defaults', () => {
    render(
      <ConsentProvider config={config} i18n={{ acceptAll: 'YES PLEASE' }}>
        <ConsentBanner />
      </ConsentProvider>,
    );
    expect(screen.getByText('YES PLEASE')).toBeInTheDocument();
    // Untouched keys still come from English defaults
    expect(screen.getByText('Reject all')).toBeInTheDocument();
  });

  it('renders preferences modal in French and supports per-category label override', () => {
    const customFr: ConsentI18n = {
      ...frLocale,
      categories: { analytics: { label: 'Analytique', description: 'Mesure d’audience' } },
    };
    render(
      <ConsentProvider config={config} i18n={customFr}>
        <ConsentPreferences />
      </ConsentProvider>,
    );
    expect(screen.getByText('Préférences de confidentialité')).toBeInTheDocument();
    expect(screen.getByText(/Analytique/)).toBeInTheDocument();
    expect(screen.getByText(/Mesure d’audience/)).toBeInTheDocument();
  });

  it('exposes the resolved i18n object via useConsentI18n', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsentProvider config={config} i18n={deLocale}>
        {children}
      </ConsentProvider>
    );
    const { result } = renderHook(() => useConsentI18n(), { wrapper });
    expect(result.current.acceptAll).toBe('Alle akzeptieren');
    expect(result.current.bannerBody).toBe(deLocale.bannerBody);
  });
});
