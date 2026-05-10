import React from 'react';

interface ConsentErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Optional fallback rendered when the boundary catches an error.
   * Defaults to `null` (silently swallow) — host apps that want a
   * visible failure state should pass their own React node.
   */
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  /** Called once with the captured error and React's componentStack. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ConsentErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary that prevents a thrown error inside the consent
 * subtree from unmounting the rest of the host app.
 *
 * The library's own components don't throw under normal use, but
 * consumers attach event listeners (`consent.on('update', …)`) and
 * pass callbacks (`onSyncError`, `payloadTransform`, custom storage
 * adapters) — any of which could throw with a buggy host config and
 * propagate up through React's render boundary.
 *
 * Wrap the relevant subtree:
 *
 *   <ConsentErrorBoundary onError={Sentry.captureException}>
 *     <ConsentProvider config={...}>
 *       <App />
 *       <ConsentBanner />
 *     </ConsentProvider>
 *   </ConsentErrorBoundary>
 *
 * The boundary intentionally exposes the same `onError` signature
 * React itself uses so error reporting integrations drop in without
 * a shim.
 */
export class ConsentErrorBoundary extends React.Component<
  ConsentErrorBoundaryProps,
  ConsentErrorBoundaryState
> {
  state: ConsentErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ConsentErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error);
      }
      return fallback ?? null;
    }
    return this.props.children;
  }
}
