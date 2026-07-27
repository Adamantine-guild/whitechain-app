/**
 * AssetTable.test.tsx
 *
 * Tests for components/AssetTable.tsx. Verifies issue #10 acceptance:
 *  - 5 SkeletonRows render while loading (no layout jump)
 *  - real rows render once data is present
 *  - a calm empty state renders when there is no data
 *
 * Run: `npm run test`
 */

import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { AssetTable } from './AssetTable';

describe('AssetTable', () => {
  afterEach(() => cleanup());

  it('renders 5 skeleton rows while loading', () => {
    render(<AssetTable isLoading rows={[]} />);
    expect(screen.getByLabelText('Loading assets')).toBeTruthy();
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(5);
  });

  it('renders real rows after loading', () => {
    render(
      <AssetTable
        isLoading={false}
        rows={[
          { symbol: 'ETH', amount: '1.0000' },
          { symbol: 'USDC', amount: '250.0000' }
        ]}
      />
    );
    expect(screen.queryByTestId('skeleton-row')).toBeNull();
    expect(screen.getByText('ETH')).toBeTruthy();
    expect(screen.getByText('USDC')).toBeTruthy();
  });

  it('renders an empty state when not loading and rows are empty', () => {
    render(<AssetTable isLoading={false} rows={[]} />);
    expect(screen.queryByTestId('skeleton-row')).toBeNull();
    expect(screen.getByText(/No assets to display/i)).toBeTruthy();
  });
});
