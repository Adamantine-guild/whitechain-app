/**
 * TransactionHistorySection.test.tsx
 *
 * Verifies issue #15 acceptance criteria: rows are paginated PAGE_SIZE at a
 * time, Prev/Next disable at the boundaries, and the current page is
 * reflected in (and readable back from) the URL's `page` param.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TransactionHistorySection, PAGE_SIZE } from './TransactionHistorySection';

const push = vi.fn();
let currentSearch = '';

vi.mock('wagmi', () => ({
  useChainId: () => 1
}));

// jsdom has no real layout, so @tanstack/react-virtual sees a 0-height
// container and renders nothing — stub it to render every row it's given so
// the row-count assertion below reflects what HistoryTable was actually
// passed rather than a virtualization artifact.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 56, key: index })),
    getTotalSize: () => count * 56,
    measureElement: () => {}
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(currentSearch)
}));

describe('TransactionHistorySection', () => {
  afterEach(() => {
    cleanup();
    push.mockClear();
    currentSearch = '';
  });

  it('renders exactly PAGE_SIZE rows on the first page', () => {
    render(<TransactionHistorySection />);
    // header row's cells aren't links; only data rows render an <a>.
    expect(screen.getAllByRole('link')).toHaveLength(PAGE_SIZE);
  });

  it('disables Prev on the first page', () => {
    render(<TransactionHistorySection />);
    expect((screen.getByText('Prev') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(false);
  });

  it('pushes ?page=2 when Next is clicked', () => {
    render(<TransactionHistorySection />);
    fireEvent.click(screen.getByText('Next'));
    expect(push).toHaveBeenCalledWith('/dashboard?page=2', { scroll: false });
  });

  it('reads the current page back from the URL', () => {
    currentSearch = 'page=3';
    render(<TransactionHistorySection />);
    expect(screen.getByText(/Page 3 \//)).toBeTruthy();
  });

  it('omits the page param entirely when navigating back to page 1', () => {
    currentSearch = 'page=2';
    render(<TransactionHistorySection />);
    fireEvent.click(screen.getByText('Prev'));
    expect(push).toHaveBeenCalledWith('/dashboard', { scroll: false });
  });
});
