'use client';

import { toast } from 'sonner';
import { type Hash, type Chain } from 'viem';

/** Build a block-explorer transaction URL for the active chain. */
export function explorerTxUrl(chain: Chain | undefined, txHash: Hash): string | null {
  const base = chain?.blockExplorers?.default?.url;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/tx/${txHash}`;
}

export type TxToastState = 'pending' | 'success' | 'error';

export interface NotifyTxOptions {
  /** Active chain, used to derive the explorer link on success. */
  chain?: Chain;
  /** Called after the success toast is shown (e.g. to close a modal). */
  onSuccess?: () => void;
}

/**
 * Fire a non-blocking toast for a transaction lifecycle event.
 *
 * - pending: "Transaction pending…" while the wallet is signing/broadcasting.
 *   Returns the toast id so callers can dismiss/replace it on settle.
 * - success: "Transaction sent" with a clickable explorer link; auto-dismisses
 *   after 5 seconds (per issue #5).
 * - error: "Transaction failed" with the surfaced message.
 */
export function notifyTx(
  state: TxToastState,
  opts: NotifyTxOptions = {}
): string | number | void {
  if (state === 'pending') {
    return toast.loading('Transaction pending…', {
      description: 'Confirm the transaction in your wallet.',
    });
  }

  if (state === 'success') {
    // `notifyTxSuccess` is the canonical success path (needs a tx hash); this
    // branch is intentionally a no-op so callers use the dedicated helpers.
    return;
  }

  return toast.error('Transaction failed', {
    description: opts.chain ? undefined : undefined,
  });
}

/** Convenience: success toast with explorer link (auto-dismiss 5s). */
export function notifyTxSuccess(txHash: Hash, chain?: Chain, onSuccess?: () => void) {
  const url = explorerTxUrl(chain, txHash);
  const isRealHash = /^0x[0-9a-fA-F]{64}$/.test(txHash);
  toast.success('Transaction sent', {
    description: isRealHash
      ? 'Your transaction was broadcast to the network.'
      : 'Your transaction was submitted.',
    duration: 5000,
    action:
      url && isRealHash
        ? {
            label: 'View on explorer',
            onClick: () => window.open(url, '_blank', 'noopener,noreferrer'),
          }
        : undefined,
  });
  onSuccess?.();
}

/** Convenience: error toast with a user-safe message. */
export function notifyTxError(message: string) {
  toast.error('Transaction failed', {
    description: message || 'The transaction was rejected or failed.',
  });
}

/**
 * Neutral info toast when a user voluntarily cancels a signing request
 * (EIP-1193 error code 4001). Dismisses any pending toast beforehand.
 */
export function notifyTxCancelled(toastId?: string | number | null) {
  if (toastId != null) toast.dismiss(toastId);
  toast.info('Transaction cancelled', {
    description: 'The transaction was cancelled by the user.',
    duration: 4000,
  });
}

/** Convenience: pending toast; returns the id so it can be dismissed on settle. */
export function notifyTxPending(): string | number {
  return toast.loading('Transaction pending…', {
    description: 'Confirm the transaction in your wallet.',
  });
}

export { toast };
