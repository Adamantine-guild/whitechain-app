'use client';

import { Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { TransactionHistorySection } from '@/components/TransactionHistorySection';
import { TransactionSimulator } from '@/components/TransactionSimulator';
import { CachedActivity } from '@/components/CachedActivity';
import { SendModal } from '@/components/SendModal';
import { PortfolioAssets } from '@/components/PortfolioAssets';
import { VaultTable } from '@/components/vaults/VaultTable';
import { PluginGrid } from '@/components/dashboard/PluginGrid';

import { SwapCard } from '@/components/swap/SwapCard';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtocolStatsBar } from '@/components/dashboard/ProtocolStatsBar';
import { RecentSwaps } from '@/components/dashboard/RecentSwaps';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section id="swap" className="lg:col-span-2">
          <ErrorBoundary>
            <SwapCard />
          </ErrorBoundary>
        </section>

        <section id="protocol-stats" className="lg:col-span-2">
          <ErrorBoundary>
            <ProtocolStatsBar />
          </ErrorBoundary>
        </section>

        <section id="staking" className="card">
          <h2 className="text-sm font-semibold text-gray-900">Staking</h2>
          <ErrorBoundary>
            <p className="mt-2 text-sm text-gray-600">No active stakes yet.</p>
          <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.staking')}</h2>
          <ErrorBoundary>
            <p className="mt-2 text-sm text-gray-600">{t('dashboard.noStakes')}</p>
          </ErrorBoundary>
        </section>

        <section id="governance" className="card">
          <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.governance')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('dashboard.noProposals')}</p>
        </section>

        <section id="recent-swaps" className="lg:col-span-2">
          <ErrorBoundary>
            <RecentSwaps />
          </ErrorBoundary>
        </section>

        <section id="portfolio" className="card lg:col-span-2">
          <ErrorBoundary>
            <PortfolioAssets />
          </ErrorBoundary>
          <button type="button" className="btn mt-3" onClick={() => setSendOpen(true)}>
            {t('dashboard.sendAsset')}
          </button>
        </section>

        <ErrorBoundary>
          <TransactionSimulator />
        </ErrorBoundary>

        <ErrorBoundary>
          <CachedActivity />
        </ErrorBoundary>

        {/* useSearchParams (page state, #15) requires a Suspense boundary. */}
        <Suspense fallback={null}>
          <ErrorBoundary>
            <TransactionHistorySection />
          </ErrorBoundary>
        </Suspense>

        {/*
         * Community plugin widgets — renders nothing when no plugins are
         * registered, so existing layout is unaffected by default.
         * Plugins register themselves via usePluginSDK().registerPlugin().
         */}
        <ErrorBoundary>
          <PluginGrid />
        </ErrorBoundary>
      </div>

      <SendModal isOpen={sendOpen} onClose={() => setSendOpen(false)} />
    </DashboardLayout>
  );
}
