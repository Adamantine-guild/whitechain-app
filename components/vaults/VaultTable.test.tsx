/**
 * VaultTable.test.tsx
 *
 * Tests for components/vaults/VaultTable.tsx. Verifies issue #60 acceptance:
 *  - 3 skeleton cards render on mobile while loading
 *  - 3 skeleton rows render on desktop while loading
 *  - real vault cards/rows render once data is loaded
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { VaultTable } from './VaultTable';

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234', isConnected: true }),
  useBalance: () => ({ data: { formatted: '10.0', symbol: 'ETH' } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/hooks/queries/useProtocolStats', () => ({
  useProtocolStats: vi.fn(),
}));

import { useProtocolStats } from '@/lib/hooks/queries/useProtocolStats';

describe('VaultTable', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders 3 skeleton cards on mobile while loading', () => {
    (useProtocolStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<VaultTable />);
    // Desktop table is hidden on mobile, mobile cards are shown
    expect(screen.getAllByTestId('vault-skeleton-card')).toHaveLength(3);
  });

  it('renders skeleton rows on desktop while loading', () => {
    (useProtocolStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });
    render(<VaultTable />);
    // Desktop skeleton rows are rendered (hidden on mobile viewport, but still in DOM)
    expect(screen.getAllByTestId('vault-skeleton-row')).toHaveLength(3);
  });

  it('renders real vault cards after loading', () => {
    const mockStats = {
      totalTvl: 12_500_000,
      totalTvlChange24h: 2.3,
      averageApy: 3.8,
      activeUsers: 1_247,
      totalUsers: 15_420,
      vaultCount: 3,
      vaults: [
        { id: 'usdc', name: 'USDC Staking Vault', asset: 'USDC', apy: 4.5, tvl: 12_500_000, tvlFormatted: '$12,500,000' },
        { id: 'eth', name: 'Ethereum Yield Vault', asset: 'ETH', apy: 3.2, tvl: 4_820, tvlFormatted: '4,820 ETH' },
        { id: 'wbtc', name: 'WBTC Core Vault', asset: 'WBTC', apy: 2.1, tvl: 320, tvlFormatted: '320 WBTC' },
      ],
    };
    (useProtocolStats as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockStats,
      isLoading: false,
      isError: false,
      error: null,
    });
    render(<VaultTable />);
    expect(screen.queryByTestId('vault-skeleton-card')).toBeNull();
    expect(screen.queryByTestId('vault-skeleton-row')).toBeNull();
    // Vault names should be present in both mobile and desktop views
    const usdcInstances = screen.getAllByText('USDC Staking Vault');
    expect(usdcInstances.length).toBeGreaterThanOrEqual(1);
    const ethInstances = screen.getAllByText('Ethereum Yield Vault');
    expect(ethInstances.length).toBeGreaterThanOrEqual(1);
  });
});