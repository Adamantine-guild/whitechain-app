'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { AssetTable, type AssetRow } from './AssetTable';
import { useOptimisticBalance } from '@/lib/hooks/useOptimisticBalance';

/**
 * PortfolioAssets — client component that loads the native balance and renders
 * it via AssetTable. While the balance query is loading, AssetTable shows
 * skeleton rows (issue #10), so the layout reserves space and never jumps.
 *
 * When a transaction is pending (optimistic update), the asset row shows the
 * post-transaction balance with a subtle "pending" badge.
 */
export function PortfolioAssets() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const {
    optimisticBalance,
    realBalance,
    hasPending,
    pendingCount,
    pendingTotalWei,
    isLoading,
  } = useOptimisticBalance({
    address,
    query: { refetchOnWindowFocus: false },
  });

  const rows: AssetRow[] = optimisticBalance
    ? [
        {
          symbol: optimisticBalance.symbol,
          amount: Number(optimisticBalance.formatted).toFixed(4),
          valueUsd: undefined,
          isPending: hasPending,
        },
      ]
    : [];

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-900">{t('assets.title')}</h2>
      <AssetTable isLoading={isLoading && !!address} rows={rows} />
      {hasPending && (
        <p className="mt-2 text-xs text-amber-700">
          {pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''} —
          balance will update on confirmation.
        </p>
      )}
    </div>
  );
}

export default PortfolioAssets;