'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { href: '#overview', key: 'dashboard.overview' as const },
  { href: '#staking', key: 'dashboard.staking' as const },
  { href: '#governance', key: 'dashboard.governance' as const },
  { href: '#portfolio', key: 'dashboard.portfolio' as const },
  { href: '#plugins', key: 'dashboard.plugins' as const }
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
      <button
        type="button"
        onClick={() => setIsSidebarOpen((open) => !open)}
        className="btn-outline w-full md:hidden"
        aria-expanded={isSidebarOpen}
        aria-controls="dashboard-sidebar"
      >
        {isSidebarOpen ? t('dashboard.hideMenu') : t('dashboard.showMenu')}
      </button>

      <nav
        id="dashboard-sidebar"
        className={clsx('shrink-0 md:block', isSidebarOpen ? 'block' : 'hidden')}
      >
        <ul className="card flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="shrink-0">
              <a
                href={item.href}
                className="block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {t(item.key)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
