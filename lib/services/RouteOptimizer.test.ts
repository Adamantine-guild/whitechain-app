import { describe, it, expect } from 'vitest';
import {
  findBestRoute,
  getAmountOut,
  DEFAULT_POOLS,
  simulateRoute,
} from './RouteOptimizer';

describe('RouteOptimizer', () => {
  it('correctly calculates single hop getAmountOut with 0.3% fee', () => {
    const amountIn = 1_000_000n; // 1 USDC
    const reserveIn = 1_000_000_000n;
    const reserveOut = 1_000_000_000n;

    // 1_000_000 * 9970 * 1_000_000_000 / (1_000_000_000 * 10000 + 1_000_000 * 9970)
    const out = getAmountOut(amountIn, reserveIn, reserveOut, 30);
    expect(out).toBeGreaterThan(0n);
    expect(out).toBeLessThan(amountIn); // due to fee & slippage
  });

  it('finds a direct single hop route when pool exists (e.g. USDC -> WETH)', () => {
    const route = findBestRoute('USDC', 'WETH', 1_000_000_000n, DEFAULT_POOLS); // 1000 USDC
    expect(route).not.toBeNull();
    expect(route?.path).toEqual(['USDC', 'WETH']);
    expect(route?.hops.length).toBe(1);
    expect(route?.totalFeeBps).toBe(30);
  });

  it('finds a multi-hop route (USDC -> WETH -> WBTC) when no direct pool exists', () => {
    const route = findBestRoute('USDC', 'WBTC', 10_000_000_000n, DEFAULT_POOLS); // 10,000 USDC
    expect(route).not.toBeNull();
    expect(route?.path).toEqual(['USDC', 'WETH', 'WBTC']);
    expect(route?.hops.length).toBe(2);
    expect(route?.totalFeeBps).toBe(60); // 30bps + 30bps
    expect(route?.expectedOutput).toBeGreaterThan(0n);
  });

  it('returns null when no liquidity path exists between tokens', () => {
    const route = findBestRoute('USDC', 'UNKNOWN', 1_000_000n, DEFAULT_POOLS);
    expect(route).toBeNull();
  });
});
