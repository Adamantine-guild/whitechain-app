'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { TransactionHistorySection } from '@/components/TransactionHistorySection';
import { TransactionSimulator } from '@/components/TransactionSimulator';
import { SendModal } from '@/components/SendModal';

export default function DashboardPage() {
  const [sendOpen, setSendOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section id="staking" className="card">
          <h2 className="text-sm font-semibold text-gray-900">Staking</h2>
          <p className="mt-2 text-sm text-gray-600">No active stakes yet.</p>
        </section>

        <section id="governance" className="card">
          <h2 className="text-sm font-semibold text-gray-900">Governance</h2>
          <p className="mt-2 text-sm text-gray-600">No open proposals.</p>
        </section>

        <section id="portfolio" className="card lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-900">Portfolio</h2>
          <p className="mt-2 text-sm text-gray-600">Connect a wallet to see your holdings.</p>
          <button type="button" className="btn mt-3" onClick={() => setSendOpen(true)}>
            Send asset
          </button>
        </section>

        <TransactionSimulator />

        <TransactionHistorySection />
      </div>

      <SendModal isOpen={sendOpen} onClose={() => setSendOpen(false)} />
    </DashboardLayout>
  );
}
