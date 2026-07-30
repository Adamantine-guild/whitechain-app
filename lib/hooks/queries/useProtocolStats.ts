'use client';

import { useQuery } from '@tanstack/react-query';

export interface ProtocolStats {
  totalTvl: number;
  totalTvlChange24h: number;
  averageApy: number;
  activeUsers: number;
  totalUsers: number;
  vaultCount: number;
  vaults: Array<{
    id: string;
    name: string;
    asset: string;
    apy: number;
    tvl: number;
    tvlFormatted: string;
  }>;
}

const fallbackStats: ProtocolStats = {
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

async function fetchProtocolStats(): Promise<ProtocolStats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    const response = await fetch(`${apiUrl}/protocol/stats`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch protocol stats: ${response.statusText}`);
    }
    return response.json();
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  return fallbackStats;
}

export const protocolStatsQueryKey = ['protocolStats'] as const;

export function useProtocolStats() {
  return useQuery({
    queryKey: protocolStatsQueryKey,
    queryFn: fetchProtocolStats,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
