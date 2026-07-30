/**
 * RouteOptimizer service.
 * Builds an AMM liquidity pool graph and computes optimal single & multi-hop swap routes.
 */

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  icon?: string;
}

export interface LiquidityPool {
  id: string;
  tokenA: string; // Token symbol or address
  tokenB: string; // Token symbol or address
  reserveA: bigint; // Liquidity reserve for token A
  reserveB: bigint; // Liquidity reserve for token B
  feeBps: number; // Swap fee in basis points (e.g. 30 = 0.3%)
}

export interface Hop {
  poolId: string;
  tokenIn: string;
  tokenOut: string;
  feeBps: number;
}

export interface SwapRoute {
  path: string[]; // e.g. ['USDC', 'WETH', 'WBTC']
  hops: Hop[];
  amountIn: bigint;
  expectedOutput: bigint;
  priceImpactPercent: number;
  totalFeeBps: number;
}

// Default supported tokens
export const KNOWN_TOKENS: Record<string, Token> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
};

// Default Liquidity Pools (Mock AMM data)
// Note: USDC <-> WETH, WETH <-> WBTC exist, but NO direct USDC <-> WBTC pool!
export const DEFAULT_POOLS: LiquidityPool[] = [
  {
    id: 'pool-usdc-weth',
    tokenA: 'USDC',
    tokenB: 'WETH',
    reserveA: BigInt(10_000_000_000_000), // 10,000,000 USDC (6 decimals)
    reserveB: BigInt(3_333_000_000_000_000_000_000), // ~3,333 WETH (18 decimals)
    feeBps: 30, // 0.30%
  },
  {
    id: 'pool-weth-wbtc',
    tokenA: 'WETH',
    tokenB: 'WBTC',
    reserveA: BigInt(2_000_000_000_000_000_000_000), // 2,000 WETH (18 decimals)
    reserveB: BigInt(100_000_000_000), // 1,000 WBTC (8 decimals)
    feeBps: 30, // 0.30%
  },
  {
    id: 'pool-dai-weth',
    tokenA: 'DAI',
    tokenB: 'WETH',
    reserveA: BigInt(5_000_000_000_000_000_000_000_000), // 5,000,000 DAI (18 decimals)
    reserveB: BigInt(1_666_000_000_000_000_000_000), // ~1,666 WETH
    feeBps: 30,
  },
  {
    id: 'pool-usdt-usdc',
    tokenA: 'USDT',
    tokenB: 'USDC',
    reserveA: BigInt(5_000_000_000_000), // 5,000,000 USDT
    reserveB: BigInt(5_000_000_000_000), // 5,000,000 USDC
    feeBps: 10, // 0.10%
  },
];

/**
 * Calculates output amount for a single hop using constant product invariant (x * y = k)
 * dx_with_fee = dx * (10000 - feeBps) / 10000
 * dy = (y * dx_with_fee) / (x + dx_with_fee)
 */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number = 30
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const feeMultiplier = BigInt(10_000 - feeBps);
  const amountInWithFee = amountIn * feeMultiplier;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * BigInt(10_000) + amountInWithFee;
  return numerator / denominator;
}

/**
 * Finds all valid paths up to maxHops from tokenIn to tokenOut.
 */
function findAllPaths(
  tokenIn: string,
  tokenOut: string,
  pools: LiquidityPool[],
  maxHops: number = 3
): LiquidityPool[][] {
  const validPaths: LiquidityPool[][] = [];

  function dfs(currentSymbol: string, currentPath: LiquidityPool[], visitedTokens: Set<string>) {
    if (currentSymbol === tokenOut && currentPath.length > 0) {
      validPaths.push([...currentPath]);
      return;
    }

    if (currentPath.length >= maxHops) return;

    for (const pool of pools) {
      let nextSymbol: string | null = null;
      if (pool.tokenA === currentSymbol) nextSymbol = pool.tokenB;
      else if (pool.tokenB === currentSymbol) nextSymbol = pool.tokenA;

      if (nextSymbol && !visitedTokens.has(nextSymbol)) {
        visitedTokens.add(nextSymbol);
        currentPath.push(pool);
        dfs(nextSymbol, currentPath, visitedTokens);
        currentPath.pop();
        visitedTokens.delete(nextSymbol);
      }
    }
  }

  const visited = new Set<string>([tokenIn]);
  dfs(tokenIn, [], visited);
  return validPaths;
}

/**
 * Simulates swapping amountIn through a chain of pools and returns the final output amount and hop details.
 */
export function simulateRoute(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  poolPath: LiquidityPool[]
): SwapRoute | null {
  if (amountIn <= 0n || poolPath.length === 0) return null;

  const path: string[] = [tokenIn];
  const hops: Hop[] = [];
  let currentToken = tokenIn;
  let currentAmount = amountIn;
  let cumulativeFeeBps = 0;

  for (const pool of poolPath) {
    const isTokenA = pool.tokenA === currentToken;
    const nextToken = isTokenA ? pool.tokenB : pool.tokenA;
    const reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
    const reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

    const output = getAmountOut(currentAmount, reserveIn, reserveOut, pool.feeBps);
    if (output <= 0n) return null;

    hops.push({
      poolId: pool.id,
      tokenIn: currentToken,
      tokenOut: nextToken,
      feeBps: pool.feeBps,
    });

    cumulativeFeeBps += pool.feeBps;
    currentToken = nextToken;
    currentAmount = output;
    path.push(nextToken);
  }

  if (currentToken !== tokenOut) return null;

  // Approximate price impact percentage
  const priceImpactPercent = Math.min(
    99.9,
    Number(poolPath.length * 0.1 + (Number(amountIn) > 1000000 ? 0.5 : 0.05))
  );

  return {
    path,
    hops,
    amountIn,
    expectedOutput: currentAmount,
    priceImpactPercent,
    totalFeeBps: cumulativeFeeBps,
  };
}

/**
 * Finds the optimal route (highest output amount) for given tokenIn, tokenOut, and amountIn.
 */
export function findBestRoute(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  pools: LiquidityPool[] = DEFAULT_POOLS
): SwapRoute | null {
  if (tokenIn === tokenOut || amountIn <= 0n) return null;

  const paths = findAllPaths(tokenIn, tokenOut, pools);
  let bestRoute: SwapRoute | null = null;

  for (const path of paths) {
    const route = simulateRoute(tokenIn, tokenOut, amountIn, path);
    if (route && (!bestRoute || route.expectedOutput > bestRoute.expectedOutput)) {
      bestRoute = route;
    }
  }

  return bestRoute;
}
