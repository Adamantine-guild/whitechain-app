'use client';

import { useCallback, useRef } from 'react';
import { usePublicClient, useChainId } from 'wagmi';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { explorerTxUrl } from '@/components/TxToasts';
import type { Hash } from 'viem';

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
 * useTransactionToast — centralized hook for tracking transaction lifecycle
 * with automatic toast updates.
 *
 * When a component submits a transaction, it calls `trackTransaction(txHash)`
 * and the hook takes care of the rest:
 *   1. Shows a "pending" toast (yellow spinner).
 *   2. Polls for the transaction receipt.
 *   3. On success: updates the toast to green "confirmed" with a block
 *      explorer link (auto-dismiss after 5s).
 *   4. On failure: updates the toast to red "reverted" (persistent).
 *   5. On timeout: updates the toast to red "not found" (persistent).
 *
 * Usage:
 * ```tsx
 * const { trackTransaction } = useTransactionToast();
 *
 * // After submitting a tx:
 * trackTransaction(txHash);
 * ```
 */
export function useTransactionToast() {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { t } = useTranslation();
  const activeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const toastIdRef = useRef<string | number | null>(null);

  const stopPolling = useCallback(() => {
    if (activeIntervalRef.current) {
      clearInterval(activeIntervalRef.current);
      activeIntervalRef.current = null;
    }
  }, []);

  const trackTransaction = useCallback(
    (txHash: Hash) => {
      // Guard: need a public client to poll for receipts.
      if (!publicClient) {
        toast.error(t('txToasts.noClient', 'Unable to connect to the network.'));
        return;
      }

      // Guard: validate tx hash format.
      if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
        toast.error(t('txToasts.invalidHash', 'Invalid transaction hash.'));
        return;
      }

      // Clean up any previous polling session.
      stopPolling();
      attemptRef.current = 0;

      // Show a pending toast and store its id so we can update it later.
      const toastId = toast.loading(
        t('txToasts.pending', 'Transaction pending…'),
        {
          description: t('txToasts.confirming', 'Waiting for network confirmation…'),
        }
      );
      toastIdRef.current = toastId;

      // Poll for the receipt.
      const interval = setInterval(async () => {
        attemptRef.current += 1;

        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

          if (receipt) {
            clearInterval(interval);
            activeIntervalRef.current = null;

            // Build the explorer URL from the active chain.
            const chain = publicClient.chain;
            const explorerUrl = chain ? explorerTxUrl(chain, txHash) : null;

            if (receipt.status === 'success') {
              toast.success(t('txToasts.confirmed', 'Transaction confirmed'), {
                id: toastId,
                description: explorerUrl
                  ? t('txToasts.broadcast', 'Your transaction was broadcast to the network.')
                  : t('txToasts.submitted', 'Your transaction was submitted.'),
                duration: 5000,
                action:
                  explorerUrl
                    ? {
                        label: t('txToasts.viewExplorer', 'View on explorer'),
                        onClick: () => window.open(explorerUrl, '_blank', 'noopener,noreferrer'),
                      }
                    : undefined,
              });
            } else {
              // Transaction reverted — update the toast to error.
              toast.error(t('txToasts.reverted', 'Transaction reverted'), {
                id: toastId,
                description: t(
                  'txToasts.revertedDesc',
                  'The transaction was reverted on-chain. Please try again.'
                ),
                duration: Infinity,
              });
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
          activeIntervalRef.current = null;

          toast.error(t('txToasts.timeout', 'Transaction receipt not found'), {
            id: toastId,
            description: t(
              'txToasts.timeoutDesc',
              'The receipt was not found after multiple attempts. Check the block explorer for status.'
            ),
            duration: Infinity,
          });
        }
      }, POLL_INTERVAL_MS);

      activeIntervalRef.current = interval;
    },
    [publicClient, t, stopPolling]
  );

  return { trackTransaction };
}