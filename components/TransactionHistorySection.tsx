'use client';

import { useMemo } from 'react';
import { HistoryTable, type TransactionRow } from './HistoryTable';

const TYPES = ['Send', 'Receive', 'Swap', 'Stake', 'Unstake'];

function buildMockRows(count: number): TransactionRow[] {
  const rows: TransactionRow[] = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      hash: `0x${(i + 1).toString(16).padStart(8, '0')}${'a'.repeat(56)}`,
      type: TYPES[i % TYPES.length],
      amount: `${(i % 1000) / 10} ETH`,
      note: i % 37 === 0 ? 'Flagged for manual review by the compliance rule engine.' : undefined
    });
  }
  return rows;
}

export function TransactionHistorySection() {
  const rows = useMemo(() => buildMockRows(50_000), []);

  return (
    <section id="history" className="card lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-900">Transaction history</h2>
      <p className="mt-1 text-xs text-gray-500">{rows.length.toLocaleString()} transactions (mock data)</p>
      <div className="mt-3">
        <HistoryTable rows={rows} />
      </div>
    </section>
  );
}
