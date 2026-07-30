'use client';

import { useEffect, useRef } from 'react';
import { usePublicClient, useChainId, useAccount } from 'wagmi';
import { useOptimisticStore } from '@/lib/store/optimisticStore';
import { notifyTxError } from '@/components/TxToasts';
import type { Hash, Address } from 'viem';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of receipt polling attempts before giving up. */
const MAX_POLL_ATTEMPTS = 60;

/** Interval (ms) between receipt polling attempts. */
const POLL_INTERVAL_MS = 2000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Watches for a transaction receipt and updates the optimistic store
 * accordingly.
 *
 * - When the receipt is found and the transaction succeeded (status === 'success'),
 *   the deduction is marked as `confirmed`.
 * - When the receipt is found and the transaction failed (status === 'reverted'),
 *   the deduction is marked as `reverted`, which removes the optimistic overlay
 *   and returns the balance to its pre-transaction value. A toast is shown.
 * - After `MAX_POLL_ATTEMPTS` without a receipt, the deduction is also
 *   reverted to prevent the UI from being stuck in a pending state forever.
 *
 * This hook is designed to be called from components that submit transactions
 * (e.g., SendModal), passing the tx hash immediately after submission.
 *
 * Usage:
 * ```ts
 * useTransactionReceiptWatcher(userAddress, txHash, sentAmountWei);
 * ```
 */
export function useTransactionReceiptWatcher(
  address: Address | undefined,
  txHash: Hash | undefined,
  sentAmountWei: bigint | undefined
): void {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const addDeduction = useOptimisticStore((s) => s.addDeduction);
  const confirmDeduction = useOptimisticStore((s) => s.confirmDeduction);
  const revertDeduction = useOptimisticStore((s) => s.revertDeduction);
  const attemptRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!publicClient || !address || !txHash || !sentAmountWei || sentAmountWei <= 0n) {
      return;
    }

    // Prevent double-registration in strict mode.
    if (startedRef.current) return;
    startedRef.current = true;
    attemptRef.current = 0;

    // Record the optimistic deduction immediately.
    addDeduction(address, txHash, sentAmountWei);

    // Poll for the receipt.
    const interval = setInterval(async () => {
      attemptRef.current += 1;

      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        if (receipt) {
          clearInterval(interval);

          if (receipt.status === 'success') {
            confirmDeduction(address, txHash);
          } else {
            // Transaction reverted — remove the optimistic overlay.
            revertDeduction(address, txHash);
            notifyTxError('Transaction reverted on-chain. The balance has been restored.');
          }
          return;
        }
      } catch {
        // getTransactionReceipt throws when the tx hasn't been mined yet.
        // This is expected — we keep polling.
      }

      // Timeout: give up after MAX_POLL_ATTEMPTS.
      if (attemptRef.current >= MAX_POLL_ATTEMPTS) {
        clearInterval(interval);
        revertDeduction(address, txHash);
        notifyTxError(
          'Transaction receipt not found after multiple attempts. The balance has been restored.'
        );
      }
    }, POLL_INTERVAL_MS);

    // Clean up on unmount — if the component unmounts before the receipt
    // is found, keep the deduction as pending (it will be resolved by the
    // user's next interaction or when the store is pruned).
    return () => {
      clearInterval(interval);
    };
  }, [
    publicClient,
    address,
    txHash,
    sentAmountWei,
    addDeduction,
    confirmDeduction,
    revertDeduction,
  ]);
}