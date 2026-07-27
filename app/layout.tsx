import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'WhiteChain',
  description: 'Frontend application for the White Chain dApp.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>
            <Navbar />
            <main className="container py-8">{children}</main>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
