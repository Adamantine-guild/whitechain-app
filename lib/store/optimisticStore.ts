'use client';

import { create } from 'zustand';
import type { Hash, Address } from 'viem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimisticDeduction {
  /** Transaction hash that produced this deduction. */
  txHash: Hash;
  /** Amount (in wei) deducted from the sender's balance. */
  amountWei: bigint;
  /** Timestamp (ms) when the deduction was recorded. */
  timestamp: number;
  /** Current status of the transaction. */
  status: 'pending' | 'confirmed' | 'reverted';
}

export interface OptimisticState {
  /**
   * Map of sender address → pending deductions.
   * Each deduction represents a transaction whose receipt has not yet been
   * observed (confirmed or reverted).
   */
  deductions: Record<Address, OptimisticDeduction[]>;

  /**
   * Record an optimistic deduction when a transaction is submitted.
   * Returns the entry so callers can reference it later.
   */
  addDeduction: (address: Address, txHash: Hash, amountWei: bigint) => OptimisticDeduction;

  /**
   * Mark a deduction as confirmed (transaction succeeded on-chain).
   * The balance is already correct on-chain, so the optimistic overlay
   * is no longer needed.
   */
  confirmDeduction: (address: Address, txHash: Hash) => void;

  /**
   * Mark a deduction as reverted (transaction failed on-chain).
   * The optimistic deduction should be removed so the balance returns
   * to its pre-transaction value.
   */
  revertDeduction: (address: Address, txHash: Hash) => void;

  /**
   * Get the total pending deduction amount (in wei) for a given address.
   */
  getPendingDeduction: (address: Address) => bigint;

  /**
   * Get all pending deductions for a given address.
   */
  getPendingDeductions: (address: Address) => OptimisticDeduction[];

  /**
   * Clean up old entries (older than 30 minutes) to prevent memory leaks.
   */
  prune: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Entries older than this are pruned. */
const MAX_AGE_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Global optimistic-update store.
 *
 * Tracks pending balance deductions that are expected to be reflected
 * on-chain once a transaction is confirmed. The UI can immediately
 * reflect the post-transaction balance while the network confirms.
 *
 * Usage:
 * ```ts
 * import { useOptimisticStore } from '@/lib/store/optimisticStore';
 *
 * const addDeduction = useOptimisticStore((s) => s.addDeduction);
 * const pending = useOptimisticStore((s) => s.getPendingDeduction(address));
 * ```
 */
export const useOptimisticStore = create<OptimisticState>()((set, get) => ({
  deductions: {},

  addDeduction: (address: Address, txHash: Hash, amountWei: bigint) => {
    const entry: OptimisticDeduction = {
      txHash,
      amountWei,
      timestamp: Date.now(),
      status: 'pending',
    };
    set((state) => {
      const existing = state.deductions[address] ?? [];
      return {
        deductions: {
          ...state.deductions,
          [address]: [...existing, entry],
        },
      };
    });
    return entry;
  },

  confirmDeduction: (address: Address, txHash: Hash) => {
    set((state) => {
      const list = state.deductions[address];
      if (!list) return state;
      return {
        deductions: {
          ...state.deductions,
          [address]: list.map((d) =>
            d.txHash === txHash ? { ...d, status: 'confirmed' as const } : d
          ),
        },
      };
    });
  },

  revertDeduction: (address: Address, txHash: Hash) => {
    set((state) => {
      const list = state.deductions[address];
      if (!list) return state;
      return {
        deductions: {
          ...state.deductions,
          [address]: list.map((d) =>
            d.txHash === txHash ? { ...d, status: 'reverted' as const } : d
          ),
        },
      };
    });
  },

  getPendingDeduction: (address: Address) => {
    const list = get().deductions[address] ?? [];
    return list
      .filter((d) => d.status === 'pending')
      .reduce((sum, d) => sum + d.amountWei, 0n);
  },

  getPendingDeductions: (address: Address) => {
    const list = get().deductions[address] ?? [];
    return list.filter((d) => d.status === 'pending');
  },

  prune: () => {
    const cutoff = Date.now() - MAX_AGE_MS;
    set((state) => {
      const next: Record<Address, OptimisticDeduction[]> = {};
      for (const [addr, list] of Object.entries(state.deductions)) {
        const filtered = list.filter(
          (d) => d.status === 'pending' && d.timestamp > cutoff
        );
        if (filtered.length > 0) {
          next[addr as Address] = filtered;
        }
      }
      return { deductions: next };
    });
  },
}));