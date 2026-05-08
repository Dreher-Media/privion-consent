import React, { useState } from 'react';
import { useConsent } from './context.js';
import { useConsentCategory } from './hooks.js';
import type { ConsentStatus, ConsentCategoryConfig } from '@privion-consent/core';

/**
 * ConsentBanner - Headless banner component
 */
export function ConsentBanner(): JSX.Element | null {
  const { consent, state } = useConsent();
  const [showPreferences, setShowPreferences] = useState(false);

  // Check if banner should be shown (no decision made for optional categories)
  const config = consent.getConfig();
  const optionalCategories = config.categories.filter(
    (cat: ConsentCategoryConfig) => !cat.required,
  );
  const hasDecision = optionalCategories.some(
    (cat: ConsentCategoryConfig) => state.categories[cat.id] !== 'unknown',
  );

  if (hasDecision) {
    return null;
  }

  return (
    <div data-privion-banner>
      <p>We use cookies and similar technologies to improve your experience.</p>
      <button
        onClick={() => {
          consent.rejectAll();
        }}
        data-privion-reject-all
      >
        Reject all
      </button>
      <button
        onClick={() => {
          consent.acceptAll();
        }}
        data-privion-accept-all
      >
        Accept all
      </button>
      <button
        onClick={() => {
          setShowPreferences(true);
        }}
        data-privion-open-preferences
      >
        Customize
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
  const { consent } = useConsent();
  const config = consent.getConfig();

  const handleSave = () => {
    // Preferences are saved automatically via useConsentCategory hooks
    if (onClose) {
      onClose();
    }
  };

  return (
    <div data-privion-preferences>
      <h2>Privacy preferences</h2>
      {config.categories.map((category: ConsentCategoryConfig) => (
        <CategoryToggle key={category.id} category={category} />
      ))}
      <button onClick={handleSave} data-privion-save-preferences>
        Save preferences
      </button>
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

  if (category.required) {
    return (
      <label>
        <input type="checkbox" checked={true} disabled={true} data-privion-required={category.id} />
        {category.label} (always on)
        {category.description && <span> - {category.description}</span>}
      </label>
    );
  }

  return (
    <label>
      <input
        type="checkbox"
        checked={status === 'granted'}
        onChange={(e) => {
          set(e.target.checked ? 'granted' : 'denied');
        }}
        data-privion-toggle={category.id}
      />
      {category.label}
      {category.description && <span> - {category.description}</span>}
    </label>
  );
}
