import Dexie, { type Table } from 'dexie';

/** A normalized, decoded event log row. */
export interface CachedLog {
  /** Composite key: `${chainId}:${logHash}` ensures cross-chain isolation. */
  id: string;
  chainId: number;
  blockNumber: number;
  /** Transaction hash the log belongs to. */
  txHash: string;
  /** Lowercased contract address. */
  address: string;
  /** Decoded event name (or 'unknown'). */
  eventName: string;
  /** Decoded args, JSON-serializable. */
  args: Record<string, unknown>;
  /** When this row was written to the cache. */
  cachedAt: number;
}

export interface ChainMeta {
  chainId: number;
  /** Highest block we have fully cached logs for. */
  highestBlock: number;
  /** Block hash at highestBlock; used to detect reorgs. */
  highestBlockHash: string;
  updatedAt: number;
}

/**
 * Storage abstraction so the cache can run against IndexedDB in the browser
 * and an in-memory store in tests / SSR (where IndexedDB is unavailable).
 */
export interface CacheStore {
  putLogs(logs: CachedLog[]): Promise<void>;
  getLogs(chainId: number, fromBlock: number, toBlock: number): Promise<CachedLog[]>;
  getMeta(chainId: number): Promise<ChainMeta | undefined>;
  putMeta(meta: ChainMeta): Promise<void>;
  deleteLogsAbove(chainId: number, blockNumber: number): Promise<void>;
  clear(): Promise<void>;
}

/** Browser-backed store using Dexie + IndexedDB. */
class DexieCache extends Dexie implements CacheStore {
  logs!: Table<CachedLog, string>;
  meta!: Table<ChainMeta, number>;

  constructor() {
    super('whitechain-cache');
    this.version(1).stores({
      logs: 'id, chainId, blockNumber, [chainId+blockNumber]',
      meta: 'chainId'
    });
  }

  async putLogs(rows: CachedLog[]): Promise<void> {
    if (rows.length === 0) return;
    await this.logs.bulkPut(rows);
  }

  async getLogs(chainId: number, fromBlock: number, toBlock: number): Promise<CachedLog[]> {
    return this.logs
      .where('[chainId+blockNumber]')
      .between([chainId, fromBlock], [chainId, toBlock], true, true)
      .toArray();
  }

  async getMeta(chainId: number): Promise<ChainMeta | undefined> {
    return this.meta.get(chainId);
  }

  async putMeta(meta: ChainMeta): Promise<void> {
    await this.meta.put(meta);
  }

  async deleteLogsAbove(chainId: number, blockNumber: number): Promise<void> {
    const toRemove = await this.logs
      .where('[chainId+blockNumber]')
      .between([chainId, blockNumber], [chainId, Number.MAX_SAFE_INTEGER], true, true)
      .primaryKeys();
    await this.logs.bulkDelete(toRemove as string[]);
  }

  async clear(): Promise<void> {
    await this.logs.clear();
    await this.meta.clear();
  }
}

/** In-memory store (tests / SSR fallback). */
export class MemoryCache implements CacheStore {
  private logMap = new Map<string, CachedLog>();
  private metaMap = new Map<number, ChainMeta>();

  async putLogs(rows: CachedLog[]): Promise<void> {
    for (const r of rows) this.logMap.set(r.id, r);
  }

  async getLogs(chainId: number, fromBlock: number, toBlock: number): Promise<CachedLog[]> {
    return Array.from(this.logMap.values())
      .filter(
        (l) => l.chainId === chainId && l.blockNumber >= fromBlock && l.blockNumber <= toBlock
      )
      .sort((a, b) => a.blockNumber - b.blockNumber);
  }

  async getMeta(chainId: number): Promise<ChainMeta | undefined> {
    return this.metaMap.get(chainId);
  }

  async putMeta(meta: ChainMeta): Promise<void> {
    this.metaMap.set(meta.chainId, meta);
  }

  async deleteLogsAbove(chainId: number, blockNumber: number): Promise<void> {
    for (const [id, l] of this.logMap) {
      if (l.chainId === chainId && l.blockNumber >= blockNumber) this.logMap.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.logMap.clear();
    this.metaMap.clear();
  }
}

let storeSingleton: CacheStore | null = null;

/**
 * Returns the active cache store. Uses Dexie/IndexedDB in the browser, and
 * falls back to an in-memory store during SSR or when IndexedDB is missing.
 * Pass a store to override (primarily for tests).
 */
export function getCacheStore(override?: CacheStore): CacheStore {
  if (override) return override;
  if (storeSingleton) return storeSingleton;
  const hasIndexedDB =
    typeof window !== 'undefined' && 'indexedDB' in window;
  storeSingleton = hasIndexedDB ? new DexieCache() : new MemoryCache();
  return storeSingleton;
}

function logId(chainId: number, txHash: string): string {
  return `${chainId}:${txHash}`;
}

/**
 * Persist decoded logs for a block range. Updates the chain meta with the new
 * highest fully-cached block and its hash (used later to detect reorgs).
 */
export async function cacheLogs(
  chainId: number,
  logs: Omit<CachedLog, 'id' | 'cachedAt'>[],
  highestBlock: number,
  highestBlockHash: string,
  store: CacheStore = getCacheStore()
): Promise<void> {
  const rows: CachedLog[] = logs.map((l) => ({
    ...l,
    id: logId(l.chainId, l.txHash),
    cachedAt: Date.now()
  }));
  await store.putLogs(rows);
  const prev = await store.getMeta(chainId);
  const nextMeta: ChainMeta = {
    chainId,
    highestBlock: Math.max(prev?.highestBlock ?? 0, highestBlock),
    highestBlockHash,
    updatedAt: Date.now()
  };
  await store.putMeta(nextMeta);
}

/**
 * Returns cached logs for a chain. Used to render instantly (including offline),
 * satisfying the "second page load renders instantly offline" acceptance
 * criterion.
 */
export async function getCachedLogs(
  chainId: number,
  store: CacheStore = getCacheStore()
): Promise<CachedLog[]> {
  const meta = await store.getMeta(chainId);
  if (!meta) return [];
  return store.getLogs(chainId, 0, meta.highestBlock);
}

export interface BackfillPlan {
  /** Block to start fetching from (exclusive of cached data). */
  fromBlock: number;
  /** True when we have no cached data yet. */
  isFirstLoad: boolean;
}

/**
 * Computes where the next fetch should start: one block above the highest
 * cached block (so we only request new blocks, never re-fetch history).
 */
export async function planBackfill(
  chainId: number,
  currentHead: number,
  store: CacheStore = getCacheStore()
): Promise<BackfillPlan> {
  const meta = await store.getMeta(chainId);
  if (!meta) return { fromBlock: 0, isFirstLoad: true };
  return { fromBlock: meta.highestBlock + 1, isFirstLoad: false };
}

/**
 * Graceful cache invalidation on chain re-orgs: if the previously cached tip
 * block hash no longer matches the current canonical hash, drop all logs at or
 * above the fork point so stale data is never shown.
 */
export async function handleReorg(
  chainId: number,
  forkBlock: number,
  currentTipHash: string,
  store: CacheStore = getCacheStore()
): Promise<boolean> {
  const meta = await store.getMeta(chainId);
  if (!meta) return false;
  if (meta.highestBlock === forkBlock && meta.highestBlockHash !== currentTipHash) {
    await store.deleteLogsAbove(chainId, forkBlock);
    await store.putMeta({ ...meta, highestBlock: forkBlock - 1, updatedAt: Date.now() });
    return true;
  }
  return false;
}
