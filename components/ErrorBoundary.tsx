'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Override the fallback UI. Defaults to the standard "Something went wrong" panel. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches rendering errors in any descendant component so a single bad
 * response (e.g. a malformed RPC payload) can no longer blank the whole app.
 * Per issue #13 the boundary logs the error to the console and renders a
 * fallback message instead of a white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    // Render the fallback on the next pass.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Requirement: log the error to console.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div role="alert" className="container py-8">
          <div className="card">
            <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-600">
              An unexpected error occurred while rendering this section.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
