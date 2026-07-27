/**
 * db.test.ts
 *
 * Tests for lib/database/db.ts. Exercises the cache over an in-memory store
 * (no IndexedDB required), covering:
 *  - cacheLogs persists logs + updates highest cached block
 *  - getCachedLogs returns everything up to the cached tip (instant / offline)
 *  - planBackfill resumes from highestBlock+1 (only new blocks fetched)
 *  - handleReorg prunes stale logs when the tip hash changes
 *
 * Run: `npm run test`
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MemoryCache,
  cacheLogs,
  getCachedLogs,
  planBackfill,
  handleReorg,
  type CachedLog
} from './db';

const CHAIN = 1;

function makeLog(blockNumber: number, txHash: string): Omit<CachedLog, 'id' | 'cachedAt'> {
  return {
    chainId: CHAIN,
    blockNumber,
    txHash,
    address: '0x' + 'a'.repeat(40),
    eventName: 'Transfer',
    args: { value: blockNumber }
  };
}

describe('blockchain state cache (IndexedDB layer)', () => {
  let store: MemoryCache;

  beforeEach(() => {
    store = new MemoryCache();
  });

  it('caches logs and reports the highest cached block', async () => {
    await cacheLogs(CHAIN, [makeLog(100, '0x1'), makeLog(101, '0x2')], 101, '0xhash101', store);
    const meta = await store.getMeta(CHAIN);
    expect(meta?.highestBlock).toBe(101);
    expect(meta?.highestBlockHash).toBe('0xhash101');
    const logs = await getCachedLogs(CHAIN, store);
    expect(logs).toHaveLength(2);
  });

  it('getCachedLogs serves instantly/offline (no fetcher involved)', async () => {
    await cacheLogs(CHAIN, [makeLog(50, '0x9')], 50, '0xh50', store);
    const logs = await getCachedLogs(CHAIN, store);
    expect(logs[0].blockNumber).toBe(50);
  });

  it('planBackfill resumes from highestBlock + 1 (only new blocks fetched)', async () => {
    await cacheLogs(CHAIN, [makeLog(200, '0x1')], 200, '0xh200', store);
    const plan = await planBackfill(CHAIN, 210, store);
    expect(plan.fromBlock).toBe(201);
    expect(plan.isFirstLoad).toBe(false);
  });

  it('planBackfill reports first load when nothing is cached', async () => {
    const plan = await planBackfill(CHAIN, 10, store);
    expect(plan.fromBlock).toBe(0);
    expect(plan.isFirstLoad).toBe(true);
  });

  it('handleReorg prunes logs at/above the fork when the tip hash changed', async () => {
    await cacheLogs(CHAIN, [makeLog(300, '0x1'), makeLog(301, '0x2')], 301, '0xold301', store);
    const pruned = await handleReorg(CHAIN, 301, '0xnew301', store);
    expect(pruned).toBe(true);
    const logs = await getCachedLogs(CHAIN, store);
    // Block 301 (stale tip) removed; block 300 remains until next cleanup.
    expect(logs.find((l) => l.blockNumber === 301)).toBeUndefined();
    const meta = await store.getMeta(CHAIN);
    expect(meta?.highestBlock).toBe(300);
  });

  it('handleReorg is a no-op when the tip hash still matches', async () => {
    await cacheLogs(CHAIN, [makeLog(300, '0x1')], 300, '0xkeep', store);
    const pruned = await handleReorg(CHAIN, 300, '0xkeep', store);
    expect(pruned).toBe(false);
    const logs = await getCachedLogs(CHAIN, store);
    expect(logs).toHaveLength(1);
  });
});
