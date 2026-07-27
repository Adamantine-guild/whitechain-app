'use client';

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Staking', href: '#staking' },
  { label: 'Governance', href: '#governance' },
  { label: 'Portfolio', href: '#portfolio' }
];

export function DashboardLayout({ children }: { children: ReactNode }) {
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
        {isSidebarOpen ? 'Hide menu' : 'Show menu'}
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
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
