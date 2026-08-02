'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useChainId } from 'wagmi';
import { useTranslation } from 'react-i18next';
import { HistoryTable, type TransactionRow } from './HistoryTable';
import { EmptyState } from './EmptyState';

const TYPES = ['Send', 'Receive', 'Swap', 'Stake', 'Unstake'];

/** Rows per page (#15). */
export const PAGE_SIZE = 10;

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

/** Parses `?page=` from the URL, clamped to a valid 1-based page number. */
function parsePage(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function TransactionHistorySection({
  rows: externalRows,
}: {
  /** Optional external rows. Falls back to mock data when omitted. */
  rows?: TransactionRow[];
}) {
  const { t } = useTranslation();
  const allRows = useMemo(() => externalRows ?? buildMockRows(50_000), [externalRows]);
  const chainId = useChainId();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (allRows.length === 0) {
    return (
      <section id="history" className="card lg:col-span-2" data-testid="history-empty">
        <EmptyState />
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const page = Math.min(parsePage(searchParams.get('page')), totalPages);
  const offset = (page - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => allRows.slice(offset, offset + PAGE_SIZE),
    [allRows, offset]
  );

  const goToPage = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(nextPage, 1), totalPages);
      const params = new URLSearchParams(searchParams.toString());
      if (clamped === 1) {
        params.delete('page');
      } else {
        params.set('page', String(clamped));
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, totalPages]
  );

  return (
    <section id="history" className="card lg:col-span-2">
      <h2 className="text-sm font-semibold text-gray-900">{t('history.title')}</h2>
      <p className="mt-1 text-xs text-gray-500">
        {allRows.length.toLocaleString()} {t('history.transactionsSummary', { page, totalPages })}
      </p>
      <div className="mt-3">
        <HistoryTable rows={pageRows} chainId={chainId} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
          className="btn-outline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('history.prev')}
        </button>
        <span className="text-xs text-gray-500">
          {t('history.page', { page, totalPages })}
        </span>
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
          className="btn-outline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('history.next')}
        </button>
      </div>
    </section>
  );
}
