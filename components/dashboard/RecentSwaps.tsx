'use client';

import { useRealtimeSwaps } from '@/lib/hooks/useRealtimeSwaps';
import { RefreshCw, ArrowRight, Wifi, WifiOff } from 'lucide-react';

function shortenHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatTime(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function RecentSwaps() {
  const { swaps, connected } = useRealtimeSwaps();

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Recent Swaps
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3 w-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-400">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {swaps.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-300 dark:text-gray-600" />
            <span>Waiting for swap events...</span>
          </div>
        ) : (
          swaps.slice(0, 10).map((swap) => (
            <div
              key={swap.hash}
              className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              <div className="flex items-center gap-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                <span>{shortenHash(swap.sender)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-gray-900 dark:text-gray-100">
                  {swap.amountIn} {swap.tokenIn}
                </span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">
                  {swap.amountOut} {swap.tokenOut}
                </span>
              </div>
              <span className="text-xs text-gray-400">{formatTime(swap.timestamp)}</span>
            </div>
          ))
        )}
      </div>

      {swaps.length > 10 && (
        <div className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400 dark:border-gray-800">
          Showing last 10 of {swaps.length} swaps
        </div>
      )}
    </div>
  );
}
