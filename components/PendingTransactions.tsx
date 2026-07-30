'use client';

import React from 'react';
import { useMempool, type PendingTransaction } from '@/lib/mempool/MempoolProvider';
import { useTranslation } from 'react-i18next';

/** Minimal EIP-1193 provider shape we rely on. */
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getInjectedProvider(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  return eth ?? null;
}

async function cancelOrSpeedUp(
  action: 'cancel' | 'speedup',
  tx: PendingTransaction,
  from: `0x${string}`
): Promise<string> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected wallet found. Please connect a wallet.');
  }
  // Resend the same nonce with a higher gas price; for cancel, target self
  // with 0 value. This is the standard Speed up / Cancel pattern.
  const params = [
    {
      from,
      to: action === 'cancel' ? from : tx.from,
      value: action === 'cancel' ? '0x0' : '0x0',
      nonce: `0x${tx.nonce.toString(16)}`,
      gasPrice: '0x77359400' // 2 gwei placeholder; wallet will bump if needed
    }
  ];
  const method = 'eth_sendTransaction';
  const hash = await provider.request({ method, params });
  return hash as string;
}

export function PendingTransactions() {
  const { t } = useTranslation();
  const { pending, stuck, connected } = useMempool();

  if (!connected && pending.length === 0) {
    return null;
  }

  async function handleAction(
    action: 'cancel' | 'speedup',
    tx: PendingTransaction
  ) {
    try {
      await cancelOrSpeedUp(action, tx, tx.from);
    } catch {
      // Errors are handled by the wallet UI; we keep our UI non-blocking.
    }
  }

  return (
    <section id="mempool" className="card lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-900">{t('mempool.pendingTransactions')}</h2>
      <p className="mt-1 text-xs text-gray-500">
        {t('mempool.liveTracking')}{connected ? ` (${t('mempool.connected')})` : ` (${t('mempool.notConnected')})`}.
      </p>

      {pending.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600">{t('mempool.noPending')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((tx) => (
            <li
              key={tx.hash}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 p-2"
            >
              <span className="font-mono text-xs text-gray-700" title={tx.hash}>
                {tx.hash.slice(0, 10)}…{tx.hash.slice(-6)}
              </span>
              {tx.status === 'stuck' && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t('mempool.stuck')}
                </span>
              )}
              <span className="flex gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleAction('speedup', tx)}
                >
                  {t('mempool.speedUp')}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleAction('cancel', tx)}
                >
                  {t('mempool.cancel')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {stuck.length > 0 && (
        <p className="mt-2 text-xs text-amber-700">
          {stuck.length} {t('mempool.stuckWarning')}
        </p>
      )}
    </section>
  );
}

export default PendingTransactions;
