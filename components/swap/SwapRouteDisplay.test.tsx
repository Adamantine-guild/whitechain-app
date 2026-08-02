import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { SwapRouteDisplay } from './SwapRouteDisplay';
import type { SwapRoute } from '@/lib/services/RouteOptimizer';

describe('SwapRouteDisplay', () => {
  it('renders nothing when route is null', () => {
    const { container } = render(<SwapRouteDisplay route={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders calculating state indicator', () => {
    render(<SwapRouteDisplay route={null} isCalculating={true} />);
    expect(screen.getByText(/Calculating optimal routing path/i)).toBeInTheDocument();
  });

  it('renders direct route path', () => {
    const mockRoute: SwapRoute = {
      path: ['USDC', 'WETH'],
      hops: [{ poolId: 'pool-1', tokenIn: 'USDC', tokenOut: 'WETH', feeBps: 30 }],
      amountIn: 1000n,
      expectedOutput: 500n,
      priceImpactPercent: 0.1,
      totalFeeBps: 30,
    };

    render(<SwapRouteDisplay route={mockRoute} />);
    expect(screen.getByText('Direct Route')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('WETH')).toBeInTheDocument();
    expect(screen.getByText('0.30% Fee')).toBeInTheDocument();
  });

  it('renders multi-hop route path (USDC -> WETH -> WBTC)', () => {
    const mockRoute: SwapRoute = {
      path: ['USDC', 'WETH', 'WBTC'],
      hops: [
        { poolId: 'pool-1', tokenIn: 'USDC', tokenOut: 'WETH', feeBps: 30 },
        { poolId: 'pool-2', tokenIn: 'WETH', tokenOut: 'WBTC', feeBps: 30 },
      ],
      amountIn: 10000n,
      expectedOutput: 250n,
      priceImpactPercent: 0.25,
      totalFeeBps: 60,
    };

    render(<SwapRouteDisplay route={mockRoute} />);
    expect(screen.getByText('Multi-Hop Route')).toBeInTheDocument();
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('WETH')).toBeInTheDocument();
    expect(screen.getByText('WBTC')).toBeInTheDocument();
    expect(screen.getByText('0.60% Fee')).toBeInTheDocument();
  });
});
