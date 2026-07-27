import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { TransactionHistorySection } from '@/components/TransactionHistorySection';
import { TransactionSimulator } from '@/components/TransactionSimulator';
import { CachedActivity } from '@/components/CachedActivity';

export default function DashboardPage() {
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
        </section>

        <TransactionSimulator />

        <CachedActivity />

        <TransactionHistorySection />
      </div>
    </DashboardLayout>
  );
}
