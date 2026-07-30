'use client';

import React from 'react';
import { ArrowRight, Info, Route } from 'lucide-react';
import type { SwapRoute } from '@/lib/services/RouteOptimizer';

export interface SwapRouteDisplayProps {
  route: SwapRoute | null;
  isCalculating?: boolean;
}

export function SwapRouteDisplay({ route, isCalculating }: SwapRouteDisplayProps) {
  if (isCalculating) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 animate-spin text-blue-500" />
          <span>Calculating optimal routing path…</span>
        </div>
      </div>
    );
  }

  if (!route) {
    return null;
  }

  const isMultiHop = route.hops.length > 1;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
          <Route className="h-3.5 w-3.5 text-blue-500" />
          {isMultiHop ? 'Multi-Hop Route' : 'Direct Route'}
        </span>
        <span className="font-mono text-gray-500">
          {(route.totalFeeBps / 100).toFixed(2)}% Fee
        </span>
      </div>

      {/* Visual Token Hop Path */}
      <div className="flex items-center flex-wrap gap-2 pt-1">
        {route.path.map((token, index) => {
          const isLast = index === route.path.length - 1;
          return (
            <React.Fragment key={`${token}-${index}`}>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                {token}
              </span>
              {!isLast && (
                <ArrowRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-600 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Route Info Details */}
      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-800/60">
        <span className="flex items-center gap-1">
          <Info className="h-3 w-3" />
          Price Impact
        </span>
        <span
          className={`font-medium ${
            route.priceImpactPercent > 2
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-green-600 dark:text-green-400'
          }`}
        >
          ~{route.priceImpactPercent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

export default SwapRouteDisplay;
