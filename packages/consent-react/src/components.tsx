import React, { useEffect, useState } from 'react';
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
    <div
      data-privion-banner
      role="region"
      aria-label={i18n.bannerTitle ?? i18n.bannerLabel ?? 'Cookie consent'}
    >
      <div data-privion-banner-body>
        {i18n.bannerTitle && <h2>{i18n.bannerTitle}</h2>}
        <p>{i18n.bannerBody}</p>
      </div>
      <div data-privion-banner-actions>
        <button
          type="button"
          onClick={() => {
            setShowPreferences(true);
          }}
          data-privion-open-preferences
        >
          {i18n.customize}
        </button>
        <button
          type="button"
          onClick={() => {
            consent.rejectAll();
          }}
          data-privion-reject-all
        >
          {i18n.rejectAll}
        </button>
        <button
          type="button"
          onClick={() => {
            consent.acceptAll();
          }}
          data-privion-accept-all
        >
          {i18n.acceptAll}
        </button>
      </div>
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

  // Escape closes the modal when the host gave us a way to close it.
  useEffect(() => {
    if (!onClose) {
      return;
    }
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeydown);
    return () => {
      document.removeEventListener('keydown', onKeydown);
    };
  }, [onClose]);

  return (
    <div
      data-privion-preferences
      onClick={(event) => {
        if (onClose && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {/*
        Contents sit in a single panel wrapper so the default
        stylesheet can treat one element as the modal card; flat
        children would each render as a separate card.
      */}
      <div
        data-privion-preferences-panel
        role="dialog"
        aria-modal="true"
        aria-labelledby="privion-preferences-title"
      >
        <div data-privion-preferences-header>
          <h2 id="privion-preferences-title">{i18n.preferencesTitle}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              data-privion-close-preferences
              aria-label={i18n.close ?? 'Close'}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        {i18n.preferencesDescription && (
          <p data-privion-preferences-intro>{i18n.preferencesDescription}</p>
        )}
        <div data-privion-preferences-categories>
          {config.categories.map((category: ConsentCategoryConfig) => (
            <CategoryToggle key={category.id} category={category} />
          ))}
        </div>
        <div data-privion-preferences-footer>
          <button type="button" onClick={handleSave} data-privion-save-preferences>
            {i18n.save}
          </button>
        </div>
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

  return (
    <label data-privion-category>
      <span data-privion-category-text>
        <span data-privion-category-label>
          {label}
          {category.required && <span data-privion-category-badge>{i18n.alwaysOn}</span>}
        </span>
        {description && <span data-privion-category-description>{description}</span>}
      </span>
      {category.required ? (
        <input
          type="checkbox"
          role="switch"
          checked={true}
          disabled={true}
          data-privion-required={category.id}
        />
      ) : (
        <input
          type="checkbox"
          role="switch"
          checked={status === 'granted'}
          onChange={(e) => {
            set(e.target.checked ? 'granted' : 'denied', 'preferences');
          }}
          data-privion-toggle={category.id}
        />
      )}
    </label>
  );
}

export type { ConsentI18n };
