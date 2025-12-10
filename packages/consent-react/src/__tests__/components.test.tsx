import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsentProvider, ConsentBanner, ConsentPreferences } from '../index.js'
import type { PrivionConsentConfig, ConsentStatus } from '@privion-consent/core'

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
}

describe('ConsentBanner', () => {
  it('should render when no decision has been made', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>
    )

    // Wait for provider to initialize
    await waitFor(() => {
      expect(screen.getByText(/We use cookies/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Reject all')).toBeInTheDocument()
    expect(screen.getByText('Accept all')).toBeInTheDocument()
    expect(screen.getByText('Customize')).toBeInTheDocument()
  })

  it('should not render when decision has been made', () => {
    const consentConfig: PrivionConsentConfig = {
      ...config,
      categories: config.categories.map((cat) => {
        const status: ConsentStatus = 'granted'
        return {
          ...cat,
          defaultStatus: status,
        }
      }),
    }

    render(
      <ConsentProvider config={consentConfig}>
        <ConsentBanner />
      </ConsentProvider>
    )

    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument()
  })

  it('should call acceptAll when accept button is clicked', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>
    )

    // Wait for banner to appear first
    await waitFor(() => {
      expect(screen.getByText('Accept all')).toBeInTheDocument()
    })

    const acceptButton = screen.getByText('Accept all')
    fireEvent.click(acceptButton)

    // Wait for state update and re-render
    await waitFor(() => {
      expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument()
    })
  })

  it('should show preferences when customize is clicked', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentBanner />
      </ConsentProvider>
    )

    // Wait for banner to appear first
    await waitFor(() => {
      expect(screen.getByText('Customize')).toBeInTheDocument()
    })

    const customizeButton = screen.getByText('Customize')
    fireEvent.click(customizeButton)

    // Wait for preferences to show
    await waitFor(() => {
      expect(screen.getByText('Privacy preferences')).toBeInTheDocument()
    })
  })
})

describe('ConsentPreferences', () => {
  it('should render all categories', async () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>
    )

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('Privacy preferences')).toBeInTheDocument()
    })

    // Text might be split across elements, so use more flexible matchers
    expect(screen.getByText(/Necessary/)).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(screen.getByText('Marketing')).toBeInTheDocument()
  })

  it('should disable required category checkboxes', () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>
    )

    const necessaryCheckbox = screen.getByLabelText(/Necessary.*always on/)
    expect(necessaryCheckbox).toBeDisabled()
    expect(necessaryCheckbox).toBeChecked()
  })

  it('should allow toggling optional categories', () => {
    render(
      <ConsentProvider config={config}>
        <ConsentPreferences />
      </ConsentProvider>
    )

    const analyticsCheckbox = screen.getByLabelText(/Analytics/) as HTMLInputElement
    expect(analyticsCheckbox).not.toBeChecked()

    fireEvent.click(analyticsCheckbox)
    expect(analyticsCheckbox).toBeChecked()
  })
})
