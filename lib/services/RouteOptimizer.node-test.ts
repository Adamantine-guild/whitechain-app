import assert from 'node:assert';
import {
  findBestRoute,
  getAmountOut,
  DEFAULT_POOLS,
} from './RouteOptimizer';

console.log('Testing RouteOptimizer...');

// 1. Single hop getAmountOut
const out = getAmountOut(1_000_000n, 1_000_000_000n, 1_000_000_000n, 30);
assert(out > 0n, 'Output should be greater than 0');
console.log('✔ Single hop output calculation passed');

// 2. Single hop route
const routeSingle = findBestRoute('USDC', 'WETH', 1_000_000_000n, DEFAULT_POOLS);
assert.notStrictEqual(routeSingle, null);
assert.deepStrictEqual(routeSingle?.path, ['USDC', 'WETH']);
assert.strictEqual(routeSingle?.hops.length, 1);
console.log('✔ Direct route USDC -> WETH passed');

// 3. Multi-hop route (USDC -> WETH -> WBTC)
const routeMulti = findBestRoute('USDC', 'WBTC', 10_000_000_000n, DEFAULT_POOLS);
assert.notStrictEqual(routeMulti, null);
assert.deepStrictEqual(routeMulti?.path, ['USDC', 'WETH', 'WBTC']);
assert.strictEqual(routeMulti?.hops.length, 2);
assert.strictEqual(routeMulti?.totalFeeBps, 60);
assert(routeMulti!.expectedOutput > 0n, 'Expected output should be > 0');
console.log('✔ Multi-hop route USDC -> WETH -> WBTC passed');

console.log('All RouteOptimizer assertions passed successfully!');
