'use client';

import React from 'react';
import { useAccount, useBalance } from 'wagmi';
import { AssetTable, type AssetRow } from './AssetTable';
import { useTranslation } from 'react-i18next';

/**
 * PortfolioAssets — client component that loads the native balance and renders
 * it via AssetTable. While the balance query is loading, AssetTable shows
 * skeleton rows (issue #10), so the layout reserves space and never jumps.
 */
export function PortfolioAssets() {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { data, isLoading } = useBalance({
    address,
    query: { refetchOnWindowFocus: false }
  });

  const rows: AssetRow[] = data
    ? [{ symbol: data.symbol, amount: Number(data.formatted).toFixed(4), valueUsd: undefined }]
    : [];

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-gray-900">{t('assets.title')}</h2>
      <AssetTable isLoading={isLoading && !!address} rows={rows} />
    </div>
  );
}

export default PortfolioAssets;
