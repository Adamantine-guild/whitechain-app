'use client';

import React from 'react';
import { SkeletonRow } from './SkeletonRow';

export interface AssetRow {
  symbol: string;
  amount: string;
  valueUsd?: string;
}

interface AssetTableProps {
  isLoading: boolean;
  rows: AssetRow[];
  /** Number of skeleton rows shown while loading. Defaults to 5 (issue #10). */
  skeletonCount?: number;
}

/**
 * AssetTable — renders the user's assets. While `isLoading` is true it shows
 * `skeletonCount` shimmering SkeletonRows so the layout reserves space and
 * doesn't jump when the real data arrives. After loading, it renders the real
 * rows or a calm empty state. Smooth visual transition, GPU-light.
 */
export function AssetTable({ isLoading, rows, skeletonCount = 5 }: AssetTableProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading assets"
        className="divide-y divide-gray-100"
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="px-3 py-3 text-sm text-gray-500">No assets to display.</p>;
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row, i) => (
        <div key={`${row.symbol}-${i}`} className="flex items-center justify-between px-3 py-3">
          <span className="text-sm font-medium text-gray-900">{row.symbol}</span>
          <span className="text-sm text-gray-700">{row.amount}</span>
          {row.valueUsd && <span className="text-sm text-gray-500">{row.valueUsd}</span>}
        </div>
      ))}
    </div>
  );
}

export default AssetTable;
