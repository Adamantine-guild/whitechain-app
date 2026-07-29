/**
 * Transaction History Store
 *
 * Async persistent store for the user's local transaction history cache.
 * Sensitive data (tx hashes, amounts, addresses) is encrypted at rest using
 * the AES-GCM key managed by the persistence layer.
 *
 * The store is append-only from the caller's perspective: new entries are
 * prepended so the most recent transactions come first. A configurable cap
 * prevents unbounded growth without hitting the IndexedDB quota.
 *
 * On first load a one-time migration moves any legacy
 * 'whitechain-tx-history' localStorage entry into IndexedDB.
 *
 * Usage:
 * ```ts
 * const store = getTransactionHistoryStore();
 * await store.addTransaction({ hash: '0x…', … });
 * const history = await store.getTransactions();
 * ```
 */

import {
  getPersistenceStore,
  migrateFromLocalStorage,
  type IdbPersistenceStore,
} from './persistence/idb';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TxStatus = 'pending' | 'confirmed' | 'failed';

export interface TransactionRecord {
  /** Transaction hash (0x-prefixed). */
  hash: string;
  /** Chain ID this transaction belongs to. */
  chainId: number;
  /** Block number once confirmed; undefined while pending. */
  blockNumber?: number;
  /** Unix timestamp (ms) when the transaction was first recorded. */
  timestamp: number;
  /** Sender address. */
  from: string;
  /** Recipient address. */
  to: string;
  /** Human-readable value string, e.g. "0.05 ETH". */
  value: string;
  /** Current lifecycle status. */
  status: TxStatus;
  /** Optional decoded method name, e.g. "transfer". */
  method?: string;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEY_TX_HISTORY = 'whitechain-tx-history';

/** Legacy localStorage keys migrated on first run. */
const LEGACY_LOCALSTORAGE_KEYS = [KEY_TX_HISTORY];

/** Default cap on the number of transactions kept in the local cache. */
const DEFAULT_MAX_ENTRIES = 500;

// ---------------------------------------------------------------------------
// TransactionHistoryStore class
// ---------------------------------------------------------------------------

export class TransactionHistoryStore {
  private readonly store: IdbPersistenceStore;
  private readonly maxEntries: number;
  private migrationPromise: Promise<void> | null = null;

  constructor(store?: IdbPersistenceStore, maxEntries = DEFAULT_MAX_ENTRIES) {
    this.store = store ?? getPersistenceStore();
    this.maxEntries = maxEntries;
  }

  // -------------------------------------------------------------------------
  // Migration
  // -------------------------------------------------------------------------

  ensureMigrated(): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = migrateFromLocalStorage(
        this.store,
        LEGACY_LOCALSTORAGE_KEYS,
        { sensitive: true } // tx data is sensitive — encrypt in IDB
      );
    }
    return this.migrationPromise;
  }

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------

  /**
   * Returns all cached transactions, most recent first.
   */
  async getTransactions(): Promise<TransactionRecord[]> {
    await this.ensureMigrated();
    return (await this.store.get<TransactionRecord[]>(KEY_TX_HISTORY)) ?? [];
  }

  /**
   * Returns transactions for a specific chain, most recent first.
   */
  async getTransactionsByChain(chainId: number): Promise<TransactionRecord[]> {
    const all = await this.getTransactions();
    return all.filter((tx) => tx.chainId === chainId);
  }

  /**
   * Returns a single transaction by hash, or undefined.
   */
  async getTransaction(hash: string): Promise<TransactionRecord | undefined> {
    const all = await this.getTransactions();
    return all.find((tx) => tx.hash.toLowerCase() === hash.toLowerCase());
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------

  /**
   * Prepend a new transaction to the history.
   * If a transaction with the same hash already exists it is replaced in-place
   * so status updates (pending → confirmed) work correctly.
   * Trims to `maxEntries` to stay within quota.
   */
  async addTransaction(tx: TransactionRecord): Promise<void> {
    await this.ensureMigrated();
    const existing = await this.getTransactions();

    // Upsert: remove old entry if present, then prepend the new one.
    const filtered = existing.filter(
      (t) => t.hash.toLowerCase() !== tx.hash.toLowerCase()
    );
    const updated = [tx, ...filtered].slice(0, this.maxEntries);

    // Transaction data contains addresses and amounts — encrypt at rest.
    await this.store.set(KEY_TX_HISTORY, updated, true);
  }

  /**
   * Update the status (and optionally the block number) of an existing
   * transaction. No-op if the hash is not found.
   */
  async updateTransactionStatus(
    hash: string,
    status: TxStatus,
    blockNumber?: number
  ): Promise<void> {
    await this.ensureMigrated();
    const existing = await this.getTransactions();
    const updated = existing.map((tx) =>
      tx.hash.toLowerCase() === hash.toLowerCase()
        ? { ...tx, status, ...(blockNumber !== undefined ? { blockNumber } : {}) }
        : tx
    );
    await this.store.set(KEY_TX_HISTORY, updated, true);
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  /**
   * Remove a single transaction by hash.
   */
  async removeTransaction(hash: string): Promise<void> {
    await this.ensureMigrated();
    const existing = await this.getTransactions();
    const updated = existing.filter(
      (tx) => tx.hash.toLowerCase() !== hash.toLowerCase()
    );
    await this.store.set(KEY_TX_HISTORY, updated, true);
  }

  /**
   * Clear all cached transactions and reset the migration flag so a fresh
   * migration can run again if needed.
   */
  async clear(): Promise<void> {
    await this.store.delete(KEY_TX_HISTORY);
    this.migrationPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance: TransactionHistoryStore | null = null;

/**
 * Returns the application-wide transaction history store.
 * Pass an override to inject a test double.
 */
export function getTransactionHistoryStore(
  override?: IdbPersistenceStore
): TransactionHistoryStore {
  if (override) return new TransactionHistoryStore(override);
  if (!_instance) _instance = new TransactionHistoryStore();
  return _instance;
}

/**
 * Reset the singleton (for tests only).
 * @internal
 */
export function _resetTransactionHistoryStoreSingleton(): void {
  _instance = null;
}
