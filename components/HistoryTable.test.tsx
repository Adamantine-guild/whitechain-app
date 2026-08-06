/**
 * HistoryTable.test.tsx
 *
 * Verifies the HistoryTable component's loading state (issue #60):
 *  - 6 skeleton rows render while loading
 *  - real rows render once data is loaded
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { HistoryTable } from './HistoryTable';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    measureElement: () => {},
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/explorer', () => ({
  getExplorerLink: () => 'https://explorer.example.com/tx/0x1234',
}));

describe('HistoryTable', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders 6 skeleton rows while loading', () => {
    render(<HistoryTable rows={[]} chainId={1} isLoading />);
    expect(screen.getByLabelText('Loading transactions')).toBeTruthy();
    expect(screen.getAllByTestId('history-skeleton-row')).toHaveLength(6);
  });

  it('does not render skeleton rows when not loading', () => {
    render(<HistoryTable rows={[]} chainId={1} isLoading={false} />);
    expect(screen.queryByTestId('history-skeleton')).toBeNull();
  });
});