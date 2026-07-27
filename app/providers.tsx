'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState } from 'react';
import { wagmiConfig } from '@/lib/wagmi';
import { MempoolProvider } from '@/lib/mempool/MempoolProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MempoolProvider>{children}</MempoolProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
