'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCachedLogs, type DecodedLogInput } from '@/lib/database/useCachedLogs';
import { MemoryCache } from '@/lib/database/db';

/**
 * Demo panel proving the IndexedDB cache works end-to-end: on first load it
 * "fetches" mock logs, caches them, and on the next render it serves them
 * instantly from the store (including offline). Replace `fetchRange` with a
 * real `getLogs`/decoder when an event source exists.
 */
export function CachedActivity() {
  const { t } = useTranslation();
  // A stable in-memory store so the demo survives re-renders in this session.
  const storeRef = React.useRef(new MemoryCache());

  // Mock RPC fetcher: returns a couple of decoded logs per call.
  const fetchRange = React.useCallback(
    async (from: number, to: number): Promise<DecodedLogInput[]> => {
      const out: DecodedLogInput[] = [];
      for (let b = from; b <= to; b++) {
        out.push({
          chainId: 1,
          blockNumber: b,
          txHash: `0x${b.toString(16).padStart(64, '0')}`,
          address: '0x' + 'c'.repeat(40),
          eventName: 'ProposalCreated',
          args: { id: b }
        });
      }
      return out;
    },
    []
  );

  const { logs, loading, fromCache, backfilledAt } = useCachedLogs({
    chainId: 1,
    head: 5,
    fetchRange,
    headHash: '0xhead',
    store: storeRef.current
  });

  return (
    <section id="cached-activity" className="card lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-900">{t('activity.cachedActivity')}</h2>
      <p className="mt-1 text-xs text-gray-500">
        {fromCache ? t('activity.fromCache') : loading ? t('common.loading') : t('activity.backfilled')}
        {backfilledAt ? ` ${t('activity.lastSync')}: ${new Date(backfilledAt).toLocaleTimeString()}.` : ''}
      </p>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {logs.slice(0, 10).map((l) => (
          <li key={l.id} className="font-mono text-xs">
            #{l.blockNumber} · {l.eventName}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CachedActivity;
