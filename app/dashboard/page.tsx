'use client';

import { Suspense, useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { TransactionHistorySection } from '@/components/TransactionHistorySection';
import { TransactionSimulator } from '@/components/TransactionSimulator';
import { CachedActivity } from '@/components/CachedActivity';
import { SendModal } from '@/components/SendModal';
import { PortfolioAssets } from '@/components/PortfolioAssets';
import { PluginGrid } from '@/components/dashboard/PluginGrid';

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardPage() {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section id="staking" className="card">
          <h2 className="text-sm font-semibold text-gray-900">Staking</h2>
          <ErrorBoundary>
            <p className="mt-2 text-sm text-gray-600">No active stakes yet.</p>
          </ErrorBoundary>
        </section>

        <section id="governance" className="card">
          <h2 className="text-sm font-semibold text-gray-900">Governance</h2>
          <p className="mt-2 text-sm text-gray-600">No open proposals.</p>
        </section>

        <section id="portfolio" className="card lg:col-span-2">
          <ErrorBoundary>
            <PortfolioAssets />
          </ErrorBoundary>
          <button type="button" className="btn mt-3" onClick={() => setSendOpen(true)}>
            Send asset
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
