'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { TransactionHistorySection } from '@/components/TransactionHistorySection';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonRow } from '@/components/SkeletonRow';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ActivityPage() {
  const { t } = useTranslation();
  const { address, isConnecting } = useAccount();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    if (!isConnecting) {
      const timer = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isConnecting]);

  if (isConnecting || loading) {
    return (
      <DashboardLayout>
        <section id="activity" className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('history.title')}</h2>
          <div className="mt-3 space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} columns={3} />
            ))}
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (!address) {
    return (
      <DashboardLayout>
        <EmptyState
          headline={t('activity.empty.connectHeadline')}
          description={t('activity.empty.connectDescription')}
          primaryLabel={t('common.connectWallet')}
          primaryHref="/"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section id="activity" className="card lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">{t('history.title')}</h2>
          <Link href="/dashboard" className="text-xs text-blue-600 hover:underline">
            {t('nav.home')}
          </Link>
        </div>
        <ErrorBoundary>
          <TransactionHistorySection />
        </ErrorBoundary>
      </section>
    </DashboardLayout>
  );
}
