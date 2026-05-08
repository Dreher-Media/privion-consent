import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { PrivionConsent, ConsentState, PrivionConsentConfig } from '@privion-consent/core';
import { createPrivionConsent } from '@privion-consent/core';
import { mergeI18n, type ConsentI18n } from './i18n.js';

interface ConsentContextValue {
  consent: PrivionConsent;
  state: ConsentState;
  i18n: ConsentI18n;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export interface ConsentProviderProps {
  config: PrivionConsentConfig;
  children: React.ReactNode;
  initialState?: ConsentState;
  /**
   * UI strings for the bundled components (and any host-built UIs that
   * call `useConsentI18n()`). Pass a full locale (`deLocale`, …) or a
   * partial override; missing keys fall back to the English defaults.
   */
  i18n?: Partial<ConsentI18n>;
}

/**
 * ConsentProvider - Provides consent context to React components
 */
export function ConsentProvider({
  config,
  children,
  initialState,
  i18n,
}: ConsentProviderProps): JSX.Element {
  const resolvedI18n = mergeI18n(i18n);
  const [consent] = useState<PrivionConsent>(() => {
    // Only create on client
    if (typeof window === 'undefined') {
      // Return a dummy object for SSR
      return null as any;
    }
    return createPrivionConsent(config);
  });

  const [state, setState] = useState<ConsentState>(() => {
    // Use initialState if provided (for SSR hydration)
    if (initialState) {
      return initialState;
    }
    // Otherwise get initial state from consent (only on client)
    if (consent) {
      return consent.getState();
    }
    // Fallback for SSR
    return {
      categories: {},
      updatedAt: new Date().toISOString(),
      version: config.version,
      source: 'api',
      userDecided: false,
    };
  });

  const hasSyncedGoogle = useRef(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || !consent) {
      return;
    }

    // Subscribe to consent updates
    const unsubscribeReady = consent.on('ready', (newState) => {
      setState(newState);
      // Sync Google Consent Mode after first ready
      if (!hasSyncedGoogle.current && config.googleConsentMode) {
        consent.syncGoogleConsentMode();
        hasSyncedGoogle.current = true;
      }
    });

    const unsubscribeUpdate = consent.on('update', (newState) => {
      setState(newState);
    });

    const unsubscribeAcceptAll = consent.on('accept_all', (newState) => {
      setState(newState);
    });

    const unsubscribeRejectAll = consent.on('reject_all', (newState) => {
      setState(newState);
    });

    const unsubscribeReset = consent.on('reset', (newState) => {
      setState(newState);
    });

    // If consent is already ready, sync Google Consent Mode
    if (config.googleConsentMode && !hasSyncedGoogle.current) {
      consent.syncGoogleConsentMode();
      hasSyncedGoogle.current = true;
    }

    return () => {
      unsubscribeReady();
      unsubscribeUpdate();
      unsubscribeAcceptAll();
      unsubscribeRejectAll();
      unsubscribeReset();
    };
  }, [consent, config.googleConsentMode]);

  if (!consent) {
    // SSR fallback - return children without context
    return <>{children}</>;
  }

  return (
    <ConsentContext.Provider value={{ consent, state, i18n: resolvedI18n }}>
      {children}
    </ConsentContext.Provider>
  );
}

/**
 * useConsent - Hook to access consent instance and state
 */
export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a ConsentProvider');
  }
  return context;
}

/**
 * useConsentI18n — read the resolved UI string table.
 *
 * Returns the same `ConsentI18n` object the bundled components consume,
 * so host-built banners/preferences UIs can share the lexicon without
 * duplicating it.
 */
export function useConsentI18n(): ConsentI18n {
  return useConsent().i18n;
}
