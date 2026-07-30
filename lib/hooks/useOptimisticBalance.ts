'use client';

import { useMemo } from 'react';
import { useBalance, type UseBalanceReturnType, type UseBalanceParameters } from 'wagmi';
import { useOptimisticStore } from '@/lib/store/optimisticStore';
import type { Address } from 'viem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimisticBalanceResult
  extends Omit<UseBalanceReturnType, 'data'> {
  /** The real on-chain balance as returned by wagmi. */
  realBalance: UseBalanceReturnType['data'];
  /**
   * The optimistic balance (real balance minus pending deductions).
   * This is the balance the user should see in the UI.
   */
  optimisticBalance: UseBalanceReturnType['data'] | undefined;
  /**
   * Whether there are pending (unconfirmed) optimistic deductions
   * for this address.
   */
  hasPending: boolean;
  /**
   * The number of pending deductions for this address.
   */
  pendingCount: number;
  /**
   * The total amount (in wei) of pending deductions.
   */
  pendingTotalWei: bigint;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useOptimisticBalance — wraps wagmi's `useBalance` with optimistic UI updates.
 *
 * When a transaction is submitted (e.g., via SendModal), the optimistic store
 * records a pending deduction. This hook subtracts that deduction from the
 * real on-chain balance, so the UI immediately reflects the post-transaction
 * balance without waiting for the block to be mined.
 *
 * Once the transaction is confirmed or reverted, the deduction is removed
 * from the store and the displayed balance returns to the real on-chain value.
 *
 * Usage:
 * ```ts
 * const { optimisticBalance, hasPending, pendingCount } = useOptimisticBalance({ address });
 * ```
 */
export function useOptimisticBalance(
  params: UseBalanceParameters
): OptimisticBalanceResult {
  const { data, isLoading, isError, error, isFetching, isFetched, isStale, refetch, queryKey } =
    useBalance(params);

  const address = params.address;

  const pendingTotalWei = useOptimisticStore((state) =>
    address ? state.getPendingDeduction(address) : 0n
  );
  const pendingCount = useOptimisticStore((state) => {
    if (!address) return 0;
    return state.getPendingDeductions(address).length;
  });

  const hasPending = pendingCount > 0 && pendingTotalWei > 0n;

  // Compute the optimistic balance by subtracting pending deductions
  // from the real on-chain balance.
  const optimisticBalance = useMemo(() => {
    if (!data) return undefined;
    if (pendingTotalWei <= 0n) return data;

    const currentValue = BigInt(data.value.toString());
    const optimisticValue = currentValue - pendingTotalWei;

    // Clamp to zero — the balance can't go negative.
    const clampedValue = optimisticValue < 0n ? 0n : optimisticValue;

    return {
      ...data,
      value: clampedValue,
      formatted: formatUnitsSafe(clampedValue, data.decimals),
    };
  }, [data, pendingTotalWei]);

  return {
    // Original wagmi return fields (data is the real balance)
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isFetched,
    isStale,
    refetch,
    queryKey,

    // Optimistic fields
    realBalance: data,
    optimisticBalance,
    hasPending,
    pendingCount,
    pendingTotalWei,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safe version of viem's formatUnits that works with bigint without
 * importing the full viem library.
 */
function formatUnitsSafe(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const integer = value / divisor;
  const fraction = value % divisor;

  if (fraction === 0n) return integer.toString();

  // Pad the fraction to the correct number of decimal places
  let fractionStr = fraction.toString().padStart(decimals, '0');
  // Remove trailing zeros
  fractionStr = fractionStr.replace(/0+$/, '');

  return `${integer}.${fractionStr}`;
}