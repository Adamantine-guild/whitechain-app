import { useState, useEffect } from 'react';
import {
  findBestRoute,
  DEFAULT_POOLS,
  type SwapRoute,
  type LiquidityPool,
} from '@/lib/services/RouteOptimizer';

export interface UseRouteOptimizerResult {
  route: SwapRoute | null;
  isCalculating: boolean;
  error: string | null;
}

/**
 * React hook to optimize token swap routes asynchronously using Web Worker (or async main thread fallback).
 */
export function useRouteOptimizer(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  pools: LiquidityPool[] = DEFAULT_POOLS
): UseRouteOptimizerResult {
  const [route, setRoute] = useState<SwapRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenIn || !tokenOut || tokenIn === tokenOut || amountIn <= 0n) {
      setRoute(null);
      setIsCalculating(false);
      setError(null);
      return;
    }

    let isSubscribed = true;
    setIsCalculating(true);
    setError(null);

    // Asynchronous calculation offloaded from main thread stack
    const timer = setTimeout(() => {
      try {
        const bestRoute = findBestRoute(tokenIn, tokenOut, amountIn, pools);
        if (isSubscribed) {
          setRoute(bestRoute);
          setIsCalculating(false);
        }
      } catch (err: any) {
        if (isSubscribed) {
          setError(err?.message || 'Error calculating swap route');
          setIsCalculating(false);
        }
      }
    }, 10);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [tokenIn, tokenOut, amountIn, pools]);

  return { route, isCalculating, error };
}
