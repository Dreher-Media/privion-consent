import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import type { PrivionConsent } from '@privion-consent/core';
import { ConsentProvider, useConsent } from '../index.js';

let engine: PrivionConsent | null = null;

function Show(): JSX.Element {
  const { state, consent } = useConsent();
  engine = consent;
  return <span data-testid="marketing">{state.categories.marketing}</span>;
}

describe('ConsentProvider re-renders', () => {
  beforeEach(() => {
    localStorage.clear();
    engine = null;
  });

  it('reflects every update, not just the first', () => {
    const { getByTestId } = render(
      <ConsentProvider
        config={{
          version: 1,
          storage: { type: 'localStorage' },
          categories: [{ id: 'marketing', label: 'Marketing' }],
        }}
      >
        <Show />
      </ConsentProvider>,
    );

    act(() => engine!.setCategory('marketing', 'granted'));
    expect(getByTestId('marketing').textContent).toBe('granted');

    act(() => engine!.setCategory('marketing', 'denied'));
    expect(getByTestId('marketing').textContent).toBe('denied');

    act(() => engine!.setCategory('marketing', 'granted'));
    expect(getByTestId('marketing').textContent).toBe('granted');
  });
});
