import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { ConsentProvider, useConsent } from '../context.js';
import { useConsentCategory } from '../hooks.js';
import type { PrivionConsentConfig } from '@privion-consent/core';

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
      defaultStatus: 'denied',
    },
  ],
};

describe('useConsent', () => {
  it('should provide consent instance and state', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsentProvider config={config}>{children}</ConsentProvider>
    );

    const { result } = renderHook(() => useConsent(), { wrapper });

    expect(result.current.consent).toBeDefined();
    expect(result.current.state).toBeDefined();
    expect(result.current.state.categories.necessary).toBe('granted');
    expect(result.current.state.categories.analytics).toBe('denied');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useConsent());
    }).toThrow('useConsent must be used within a ConsentProvider');

    consoleSpy.mockRestore();
  });
});

describe('useConsentCategory', () => {
  it('should return category status and setter', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsentProvider config={config}>{children}</ConsentProvider>
    );

    const { result } = renderHook(() => useConsentCategory('analytics'), { wrapper });

    expect(result.current.status).toBe('denied');
    expect(typeof result.current.set).toBe('function');
  });

  it('should update category when set is called', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConsentProvider config={config}>{children}</ConsentProvider>
    );

    const { result } = renderHook(() => useConsentCategory('analytics'), { wrapper });

    expect(result.current.status).toBe('denied');

    result.current.set('granted');

    await waitFor(() => {
      expect(result.current.status).toBe('granted');
    });
  });
});
