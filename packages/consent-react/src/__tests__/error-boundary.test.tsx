import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsentErrorBoundary } from '../index.js';
import React from 'react';

function Bomb({ error = new Error('boom') }: { error?: Error }): React.ReactElement {
  throw error;
}

beforeEach(() => {
  // React logs caught errors to console.error; silence it so the
  // test output stays readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConsentErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ConsentErrorBoundary>
        <p>safe</p>
      </ConsentErrorBoundary>,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders the static fallback when a child throws', () => {
    render(
      <ConsentErrorBoundary fallback={<p>caught</p>}>
        <Bomb />
      </ConsentErrorBoundary>,
    );
    expect(screen.getByText('caught')).toBeInTheDocument();
  });

  it('renders the function fallback with the captured error', () => {
    render(
      <ConsentErrorBoundary fallback={(err) => <p>handled: {err.message}</p>}>
        <Bomb error={new Error('exploded')} />
      </ConsentErrorBoundary>,
    );
    expect(screen.getByText(/handled: exploded/)).toBeInTheDocument();
  });

  it('calls onError with the error and componentStack info', () => {
    const onError = vi.fn();
    render(
      <ConsentErrorBoundary onError={onError} fallback={null}>
        <Bomb error={new Error('reported')} />
      </ConsentErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe('reported');
    expect(onError.mock.calls[0][1]).toMatchObject({ componentStack: expect.any(String) });
  });

  it('returns null when the fallback prop is omitted (silent swallow)', () => {
    const { container } = render(
      <ConsentErrorBoundary>
        <Bomb />
      </ConsentErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
