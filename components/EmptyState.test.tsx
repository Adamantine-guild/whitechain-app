/**
 * EmptyState.test.tsx
 *
 * Verifies issue #108 acceptance criteria:
 * - Empty state renders correctly when shown.
 * - CTA button links to the expected route.
 * - Custom props override defaults.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { EmptyState } from './EmptyState';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('EmptyState', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders with default props', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    expect(screen.getByText('Explore Vaults')).toBeInTheDocument();
  });

  it('renders custom headline and description', () => {
    render(
      <EmptyState
        headline="Custom Headline"
        description="Custom description text."
      />
    );
    expect(screen.getByText('Custom Headline')).toBeInTheDocument();
    expect(screen.getByText('Custom description text.')).toBeInTheDocument();
  });

  it('renders secondary CTA when provided', () => {
    render(
      <EmptyState
        secondaryLabel="Swap Tokens"
        secondaryHref="/swap"
      />
    );
    expect(screen.getByText('Swap Tokens')).toBeInTheDocument();
  });

  it('primary CTA links to the default dashboard route', () => {
    render(<EmptyState />);
    const link = screen.getByText('Explore Vaults').closest('a');
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('primary CTA links to a custom route when primaryHref is set', () => {
    render(<EmptyState primaryHref="/custom" primaryLabel="Go" />);
    const link = screen.getByText('Go').closest('a');
    expect(link).toHaveAttribute('href', '/custom');
  });

  it('renders the inbox icon by default', () => {
    render(<EmptyState />);
    // lucide Inbox renders an inline SVG
    const container = screen.getByTestId('empty-state');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
