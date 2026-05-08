/**
 * UI string table for the React components and any host-built UIs that
 * want to share the same lexicon.
 *
 * `categories` carries per-category overrides keyed by the category id
 * from the engine config — useful when the engine config is loaded
 * once but the labels need translating per request.
 */
export interface ConsentI18n {
  bannerTitle?: string;
  bannerBody: string;
  acceptAll: string;
  rejectAll: string;
  customize: string;
  preferencesTitle: string;
  save: string;
  alwaysOn: string;
  categories?: Record<string, { label?: string; description?: string }>;
}

export const enLocale: ConsentI18n = {
  bannerBody: 'We use cookies and similar technologies to improve your experience.',
  acceptAll: 'Accept all',
  rejectAll: 'Reject all',
  customize: 'Customize',
  preferencesTitle: 'Privacy preferences',
  save: 'Save preferences',
  alwaysOn: 'always on',
};

export const deLocale: ConsentI18n = {
  bannerBody: 'Wir verwenden Cookies und ähnliche Technologien, um dein Erlebnis zu verbessern.',
  acceptAll: 'Alle akzeptieren',
  rejectAll: 'Alle ablehnen',
  customize: 'Anpassen',
  preferencesTitle: 'Datenschutzeinstellungen',
  save: 'Einstellungen speichern',
  alwaysOn: 'immer aktiv',
};

export const frLocale: ConsentI18n = {
  bannerBody:
    'Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience.',
  acceptAll: 'Tout accepter',
  rejectAll: 'Tout refuser',
  customize: 'Personnaliser',
  preferencesTitle: 'Préférences de confidentialité',
  save: 'Enregistrer les préférences',
  alwaysOn: 'toujours actif',
};

export const esLocale: ConsentI18n = {
  bannerBody: 'Utilizamos cookies y tecnologías similares para mejorar tu experiencia.',
  acceptAll: 'Aceptar todo',
  rejectAll: 'Rechazar todo',
  customize: 'Personalizar',
  preferencesTitle: 'Preferencias de privacidad',
  save: 'Guardar preferencias',
  alwaysOn: 'siempre activo',
};

/**
 * Merge a partial override on top of the English defaults, preserving
 * any keys the caller doesn't customize.
 */
export function mergeI18n(override?: Partial<ConsentI18n>): ConsentI18n {
  if (!override) {
    return enLocale;
  }
  return {
    ...enLocale,
    ...override,
    categories: { ...(enLocale.categories ?? {}), ...(override.categories ?? {}) },
  };
}
