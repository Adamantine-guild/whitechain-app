/**
 * ErrorBoundary.test.tsx
 *
 * Unit tests for components/ErrorBoundary.tsx. Verifies:
 *  - success path: children render normally when no error is thrown
 *  - failure path: a throwing child is replaced by the "Something went wrong" fallback
 *  - requirement: the error is logged to console.error
 *  - a custom fallback can be supplied
 *
 * No DOM required — the happy path renders to a string via react-dom/server,
 * and the lifecycle methods are exercised directly for the failure path.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): React.ReactNode {
  throw new Error('boom: bad RPC response');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error is thrown', () => {
    const html = renderToString(
      React.createElement(ErrorBoundary, null, React.createElement('p', null, 'hello'))
    );
    expect(html).toMatch(/hello/);
    expect(html).not.toMatch(/Something went wrong/);
  });

  it('shows "Something went wrong" fallback when a child throws (getDerivedStateFromError)', () => {
    const next = ErrorBoundary.getDerivedStateFromError();
    expect(next).toEqual({ hasError: true });

    // Render the default fallback by forcing hasError=true.
    const boundary = new ErrorBoundary({ children: React.createElement(Boom) });
    (boundary.state as { hasError: boolean }).hasError = true;
    const html = renderToString(boundary.render() as React.ReactElement);
    expect(html).toMatch(/Something went wrong/);
  });

  it('logs the error to console.error via componentDidCatch', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const instance = new ErrorBoundary({ children: React.createElement('div') });
    const err = new Error('boom: bad RPC response');
    const info = { componentStack: '\n    at Boom' } as React.ErrorInfo;
    instance.componentDidCatch(err, info);

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = spy.mock.calls[0].map((a) => String(a)).join(' ');
    expect(logged).toMatch(/ErrorBoundary caught an error/);
    expect(logged).toMatch(/boom: bad RPC response/);
  });

  it('uses a custom fallback when provided', () => {
    const boundary = new ErrorBoundary({
      children: React.createElement('div'),
      fallback: React.createElement('p', null, 'custom fallback')
    });
    (boundary.state as { hasError: boolean }).hasError = true;
    const html = renderToString(boundary.render() as React.ReactElement);
    expect(html).toMatch(/custom fallback/);
    expect(html).not.toMatch(/Something went wrong/);
  });
});
