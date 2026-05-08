import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsentProvider, ConsentBanner, ConsentPreferences } from '../index.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

beforeEach(() => {
  localStorage.clear();
});

const config: PrivionConsentConfig = {
  version: 1,
  categories: [
    {
      id: 'necessary',
      label: 'Necessary',
      required: true,
      defaultStatus: 'granted',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      defaultStatus: 'unknown', // Use 'unknown' so banner shows
    },
    {
      id: 'marketing',
      label: 'Marketing',
      defaultStatus: 'unknown', // Use 'unknown' so banner shows
    },
  ],
};

describe('ConsentBanner', () => {
  it('should render when no decision has been made', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>,
    );

    // Wait for provider to initialize
    await waitFor(() => {
      expect(screen.getByText(/We use cookies/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Reject all')).toBeInTheDocument();
    expect(screen.getByText('Accept all')).toBeInTheDocument();
    expect(screen.getByText('Customize')).toBeInTheDocument();
  });

  it('should not render when the user has decided (state.userDecided=true)', () => {
    // Seed localStorage with a previously-decided state so the engine
    // hydrates with userDecided=true and skips the banner entirely.
    localStorage.setItem(
      'privion-consent',
      JSON.stringify({
        categories: { necessary: 'granted', analytics: 'granted', marketing: 'denied' },
        updatedAt: new Date().toISOString(),
        version: 1,
        source: 'banner',
        userDecided: true,
      }),
    );

    render(
      <ConsentProvider config={{ ...config, storage: { type: 'localStorage' } }}>
        <ConsentBanner />
      </ConsentProvider>,
    );

    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
  });

  it('should still render even if all defaultStatus values are granted (no real decision yet)', () => {
    // Default-granted is NOT a user decision. The banner must stay visible
    // so the user has a chance to actively confirm or change their mind.
    const allGranted: PrivionConsentConfig = {
      ...config,
      categories: config.categories.map((cat) => ({
        ...cat,
        defaultStatus: 'granted',
      })),
    };

    render(
      <ConsentProvider config={allGranted}>
        <ConsentBanner />
      </ConsentProvider>,
    );

    expect(screen.getByText(/We use cookies/i)).toBeInTheDocument();
  });

  it('should call acceptAll when accept button is clicked', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>,
    );

    // Wait for banner to appear first
    await waitFor(() => {
      expect(screen.getByText('Accept all')).toBeInTheDocument();
    });

    const acceptButton = screen.getByText('Accept all');
    fireEvent.click(acceptButton);

    // Wait for state update and re-render
    await waitFor(() => {
      expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
    });
  });

  it('should show preferences when customize is clicked', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>,
    );

    // Wait for banner to appear first
    await waitFor(() => {
      expect(screen.getByText('Customize')).toBeInTheDocument();
    });

    const customizeButton = screen.getByText('Customize');
    fireEvent.click(customizeButton);

    // Wait for preferences to show
    await waitFor(() => {
      expect(screen.getByText('Privacy preferences')).toBeInTheDocument();
    });
  });
});

describe('ConsentPreferences', () => {
  it('should render all categories', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>,
    );

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Privacy preferences')).toBeInTheDocument();
    });

    // Text might be split across elements, so use more flexible matchers
    expect(screen.getByText(/Necessary/)).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('should disable required category checkboxes', () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>,
    );

    const necessaryCheckbox = screen.getByLabelText(/Necessary.*always on/);
    expect(necessaryCheckbox).toBeDisabled();
    expect(necessaryCheckbox).toBeChecked();
  });

  it('should allow toggling optional categories', () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>,
    );

    const analyticsCheckbox = screen.getByLabelText(/Analytics/) as HTMLInputElement;
    expect(analyticsCheckbox).not.toBeChecked();

    fireEvent.click(analyticsCheckbox);
    expect(analyticsCheckbox).toBeChecked();
  });
});
