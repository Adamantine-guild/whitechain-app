import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NO_FLASH_THEME_SCRIPT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'WhiteChain',
  description: 'Frontend application for the White Chain dApp.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Applies the persisted/system theme before hydration so there's no
            flash of the wrong theme on load (#2). */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <ErrorBoundary>
          <Providers>
            <Navbar />
            <NetworkBanner />
            <main className="container py-8">{children}</main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
