import React, { useState } from 'react';
import { useConsent } from './context.js';
import { useConsentCategory } from './hooks.js';
import type { ConsentCategoryConfig } from '@privion-consent/core';
import type { ConsentI18n } from './i18n.js';

/**
 * ConsentBanner - Headless banner component.
 *
 * Visible until the user explicitly accepts/rejects via the banner or
 * saves preferences. Programmatic `setCategory()` calls do not dismiss
 * it (they leave `userDecided` false), so host apps can pre-seed
 * categories without hiding the banner before the real interaction.
 */
export function ConsentBanner(): JSX.Element | null {
  const { consent, state, i18n } = useConsent();
  const [showPreferences, setShowPreferences] = useState(false);

  if (state.userDecided) {
    return null;
  }

  return (
    <div data-privion-banner>
      {i18n.bannerTitle && <h2>{i18n.bannerTitle}</h2>}
      <p>{i18n.bannerBody}</p>
      <button
        onClick={() => {
          consent.rejectAll();
        }}
        data-privion-reject-all
      >
        {i18n.rejectAll}
      </button>
      <button
        onClick={() => {
          consent.acceptAll();
        }}
        data-privion-accept-all
      >
        {i18n.acceptAll}
      </button>
      <button
        onClick={() => {
          setShowPreferences(true);
        }}
        data-privion-open-preferences
      >
        {i18n.customize}
      </button>
      {showPreferences && (
        <ConsentPreferences
          onClose={() => {
            setShowPreferences(false);
          }}
        />
      )}
    </div>
  );
}

interface ConsentPreferencesProps {
  onClose?: () => void;
}

/**
 * ConsentPreferences - Headless preferences component
 */
export function ConsentPreferences({ onClose }: ConsentPreferencesProps): JSX.Element {
  const { consent, i18n } = useConsent();
  const config = consent.getConfig();

  const handleSave = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div data-privion-preferences>
      {/*
        Contents sit in a single panel wrapper so the default
        stylesheet can treat one element as the modal card; flat
        children would each render as a separate card.
      */}
      <div data-privion-preferences-panel>
        <h2>{i18n.preferencesTitle}</h2>
        {config.categories.map((category: ConsentCategoryConfig) => (
          <CategoryToggle key={category.id} category={category} />
        ))}
        <button onClick={handleSave} data-privion-save-preferences>
          {i18n.save}
        </button>
      </div>
    </div>
  );
}

interface CategoryToggleProps {
  category: ConsentCategoryConfig;
}

/**
 * CategoryToggle - Individual category toggle
 */
function CategoryToggle({ category }: CategoryToggleProps): JSX.Element {
  const { status, set } = useConsentCategory(category.id);
  const { i18n } = useConsent();

  // Per-category i18n override (label + description) wins over the
  // engine-config text so hosts can localize without forking the engine.
  const override = i18n.categories?.[category.id];
  const label = override?.label ?? category.label;
  const description = override?.description ?? category.description;

  if (category.required) {
    return (
      <label>
        <input type="checkbox" checked={true} disabled={true} data-privion-required={category.id} />
        {label} ({i18n.alwaysOn}){description && <span> - {description}</span>}
      </label>
    );
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={status === 'granted'}
        onChange={(e) => {
          set(e.target.checked ? 'granted' : 'denied', 'preferences');
        }}
        data-privion-toggle={category.id}
      />
      {label}
      {description && <span> - {description}</span>}
    </label>
  );
}

export type { ConsentI18n };
