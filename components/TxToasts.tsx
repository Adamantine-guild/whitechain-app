'use client';

import { toast } from 'sonner';
import { type Hash, type Chain } from 'viem';
import { t } from '@/lib/i18n/helpers';

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
    return toast.loading(t('txToasts.pending', 'Transaction pending…'), {
      description: t('txToasts.confirmWallet', 'Confirm the transaction in your wallet.'),
    });
  }

  if (state === 'success') {
    // `notifyTxSuccess` is the canonical success path (needs a tx hash); this
    // branch is intentionally a no-op so callers use the dedicated helpers.
    return;
  }

  return toast.error(t('txToasts.failed', 'Transaction failed'), {
    duration: Infinity,
  });
}

/** Convenience: success toast with explorer link (auto-dismiss 5s). */
export function notifyTxSuccess(txHash: Hash, chain?: Chain, onSuccess?: () => void) {
  const url = explorerTxUrl(chain, txHash);
  const isRealHash = /^0x[0-9a-fA-F]{64}$/.test(txHash);
  toast.success(t('txToasts.sent', 'Transaction sent'), {
    description: isRealHash
      ? t('txToasts.broadcast', 'Your transaction was broadcast to the network.')
      : t('txToasts.submitted', 'Your transaction was submitted.'),
    duration: 5000,
    action:
      url && isRealHash
        ? {
            label: t('txToasts.viewExplorer', 'View on explorer'),
            onClick: () => window.open(url, '_blank', 'noopener,noreferrer'),
          }
        : undefined,
  });
  onSuccess?.();
}

/**
 * Convenience: success toast with unified styling but no explorer link,
 * for actions that succeed without producing an on-chain tx hash yet.
 */
export function notifyTxSuccessLocal(message: string) {
  toast.success(t('txToasts.sent', 'Transaction sent'), {
    description: message,
    duration: 5000,
  });
}

/** Convenience: error toast with a user-safe message. */
export function notifyTxError(message: string) {
  toast.error(t('txToasts.failed', 'Transaction failed'), {
    description: message || t('txToasts.rejected', 'The transaction was rejected or failed.'),
    duration: Infinity,
  });
}

/** Convenience: pending toast; returns the id so it can be dismissed on settle. */
export function notifyTxPending(): string | number {
  return toast.loading(t('txToasts.pending', 'Transaction pending…'), {
    description: t('txToasts.confirmWallet', 'Confirm the transaction in your wallet.'),
  });
}

export { toast };
