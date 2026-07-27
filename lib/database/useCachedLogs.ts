'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCacheStore,
  getCachedLogs,
  planBackfill,
  cacheLogs,
  type CachedLog,
  type CacheStore
} from './db';

export interface DecodedLogInput {
  chainId: number;
  blockNumber: number;
  txHash: string;
  address: string;
  eventName: string;
  args: Record<string, unknown>;
}

export interface UseCachedLogsOptions {
  chainId: number;
  /** Current chain head; backfill triggers when it advances past cache. */
  head: number;
  /** Fetches + decodes logs for [fromBlock, toBlock]. */
  fetchRange: (
    fromBlock: number,
    toBlock: number
  ) => Promise<DecodedLogInput[]>;
  /** Block hash at `head`, used for reorg detection (optional). */
  headHash?: string;
  /** Inject a store (tests). */
  store?: CacheStore;
}

export interface UseCachedLogsResult {
  logs: CachedLog[];
  loading: boolean;
  /** True when serving from cache with no network round-trip yet. */
  fromCache: boolean;
  backfilledAt: number | null;
  refresh: () => Promise<void>;
}

/**
 * Serves decoded event logs from IndexedDB instantly (works offline), then
 * backfills only the blocks newer than the highest cached block. On first load
 * it fetches from block 0; on subsequent loads it fetches from
 * `highestCachedBlock + 1`, so historical RPC hits are avoided (issue #24).
 */
export function useCachedLogs({
  chainId,
  head,
  fetchRange,
  headHash,
  store
}: UseCachedLogsOptions): UseCachedLogsResult {
  const storeRef = useRef(store ?? getCacheStore());
  const [logs, setLogs] = useState<CachedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [backfilledAt, setBackfilledAt] = useState<number | null>(null);
  const inFlight = useRef(false);

  const backfill = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const s = storeRef.current;
      // 1) Instant cache read (offline-capable).
      const cached = await getCachedLogs(chainId, s);
      if (cached.length > 0) {
        setLogs(cached);
        setFromCache(true);
      }
      // 2) Compute where to resume fetching.
      const plan = await planBackfill(chainId, head, s);
      if (head > plan.fromBlock - 1) {
        const fetched = await fetchRange(plan.fromBlock, head);
        if (fetched.length > 0) {
          await cacheLogs(chainId, fetched, head, headHash ?? '0x', s);
        } else if (plan.isFirstLoad) {
          // Persist an empty meta so we don't refetch block 0 forever.
          await cacheLogs(chainId, [], head, headHash ?? '0x', s);
        }
        const merged = await getCachedLogs(chainId, s);
        setLogs(merged);
      }
      setFromCache(false);
      setBackfilledAt(Date.now());
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [chainId, head, fetchRange, headHash]);

  useEffect(() => {
    backfill();
  }, [backfill]);

  return { logs, loading, fromCache, backfilledAt, refresh: backfill };
}
