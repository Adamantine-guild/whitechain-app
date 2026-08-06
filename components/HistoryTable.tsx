'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getExplorerLink } from '@/lib/explorer';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/Skeleton';

export interface TransactionRow {
  hash: string;
  type: string;
  amount: string;
  note?: string;
}

export function HistoryTable({
  rows,
  chainId,
  isLoading = false,
}: {
  rows: TransactionRow[];
  chainId: number;
  /** When true, renders shimmering skeleton rows instead of data. */
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 10
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} className="card h-[480px] overflow-y-auto p-0">
      <div className="grid grid-cols-[1fr_120px_140px] gap-2 border-b border-gray-200 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
        <span>{t('history.hash')}</span>
        <span>{t('history.type')}</span>
        <span className="text-right">{t('history.amount')}</span>
      </div>
      {isLoading ? (
        <div role="status" aria-busy="true" aria-label="Loading transactions" data-testid="history-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_120px_140px] items-center gap-2 border-b border-gray-100 px-4 py-4"
              aria-hidden="true"
              data-testid="history-skeleton-row"
            >
              <Skeleton width="70%" height="0.875rem" />
              <Skeleton width="70px" height="0.875rem" />
              <Skeleton width="90px" height="0.875rem" className="justify-self-end" />
            </div>
          ))}
        </div>
      ) : (
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {items.map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.hash}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="grid grid-cols-[1fr_120px_140px] items-start gap-2 border-b border-gray-100 px-4 py-2 text-sm"
            >
              <a
                href={getExplorerLink(row.hash, 'tx', chainId)}
                target="_blank"
                rel="noopener noreferrer"
                title={row.hash}
                className="truncate font-mono text-blue-600 hover:underline"
              >
                {row.hash}
              </a>
              <span className="text-gray-600">{row.type}</span>
              <span className="text-right font-medium text-gray-900">{row.amount}</span>
              {row.note && <span className="col-span-3 whitespace-pre-wrap text-xs text-gray-500">{row.note}</span>}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
