'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getExplorerLink } from '@/lib/explorer';

export interface TransactionRow {
  hash: string;
  type: string;
  amount: string;
  note?: string;
}

export function HistoryTable({ rows, chainId }: { rows: TransactionRow[]; chainId: number }) {
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
        <span>Hash</span>
        <span>Type</span>
        <span className="text-right">Amount</span>
      </div>
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
    </div>
  );
}
