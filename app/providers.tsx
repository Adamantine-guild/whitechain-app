'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { Toaster } from 'sonner';
import { useState } from 'react';
import { wagmiConfig } from '@/lib/wagmi';
import { MempoolProvider } from '@/lib/mempool/MempoolProvider';
import { useBlockchainDataSync } from '@/lib/hooks/useBlockchainData';
import { PluginSDKProvider } from '@/lib/core/PluginSDKProvider';
import { I18nProvider } from '@/components/I18nProvider';

// Renders nothing; just mounts the block listener from issue #29 so
// balance queries invalidate smartly app-wide, not per-component.
function BlockchainDataSync() {
  useBlockchainDataSync();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BlockchainDataSync />
        <MempoolProvider>
          {/* PluginSDKProvider must be inside WagmiProvider + QueryClientProvider
              so wallet hooks are available to the plugin bridge. */}
          <PluginSDKProvider>
            <I18nProvider>{children}</I18nProvider>
          </PluginSDKProvider>
        </MempoolProvider>
      </QueryClientProvider>
      <Toaster richColors position="bottom-right" closeButton />
    </WagmiProvider>
  );
}
