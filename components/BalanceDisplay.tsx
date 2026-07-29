'use client';

import { useAccount } from 'wagmi';
import { useOptimisticBalance } from '@/lib/hooks/useOptimisticBalance';

const BalanceDisplay = () => {
  const { address } = useAccount();
  const {
    optimisticBalance,
    realBalance,
    hasPending,
    pendingCount,
    isLoading,
  } = useOptimisticBalance({
    address,
    query: { refetchOnWindowFocus: false },
  });

  // No manual per-block refetch here: useBlockchainDataSync (mounted in
  // Providers) invalidates this query only when a transfer touches `address`.
  if (isLoading) {
    return <span className="h-4 w-16 animate-pulse rounded bg-gray-200" aria-label="Loading balance" />;
  }

  if (!optimisticBalance || !realBalance) return null;

  // Show the optimistic balance with a pending indicator.
  const displayBalance = Number(optimisticBalance.formatted).toFixed(4);
  const displaySymbol = optimisticBalance.symbol;

  return (
    <span className="text-sm font-medium text-gray-700">
      {displayBalance} {displaySymbol}
      {hasPending && (
        <span
          className="ml-1.5 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
          title={`${pendingCount} pending transaction(s) — balance will update on confirmation`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Pending
        </span>
      )}
    </span>
  );
};

export default BalanceDisplay;