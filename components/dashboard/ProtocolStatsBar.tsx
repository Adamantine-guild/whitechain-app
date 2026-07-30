'use client';

import { useProtocolStats } from '@/lib/hooks/queries/useProtocolStats';
import { useRealtimeTVL } from '@/lib/hooks/useRealtimeTVL';
import { TrendingUp, Users, DollarSign, Layers, Wifi, WifiOff } from 'lucide-react';

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function ProtocolStatsBar() {
  const { data: stats, isLoading } = useProtocolStats();
  const { connected: tvlConnected } = useRealtimeTVL();

  const items = [
    {
      label: 'Total Value Locked',
      value: stats ? formatCurrency(stats.totalTvl) : '—',
      sub: stats ? `${stats.totalTvlChange24h >= 0 ? '+' : ''}${stats.totalTvlChange24h.toFixed(1)}% (24h)` : null,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Average APY',
      value: stats ? `${stats.averageApy.toFixed(1)}%` : '—',
      sub: 'Across all vaults',
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Users',
      value: stats ? stats.activeUsers.toLocaleString() : '—',
      sub: stats ? `${stats.totalUsers.toLocaleString()} total` : null,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Vaults',
      value: stats ? String(stats.vaultCount) : '—',
      sub: stats ? `${stats.vaults.length} active` : null,
      icon: Layers,
      color: 'text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Protocol Overview
        </h2>
        <div className="flex items-center gap-1.5 text-xs">
          {tvlConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3 w-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <WifiOff className="h-3 w-3" />
              Cache
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className={`shrink-0 rounded-lg bg-gray-50 p-2 dark:bg-gray-800 ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {isLoading ? (
                    <span className="inline-block h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  ) : (
                    item.value
                  )}
                </p>
                {!isLoading && item.sub && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">{item.sub}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
