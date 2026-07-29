import { useAccount, useDisconnect, useWatchBlockNumber, useBalance } from 'wagmi';

const BalanceDisplay = () => {
  const { address } = useAccount();
  const { data, isLoading, refetch } = useBalance({
    address,
    query: { refetchOnWindowFocus: false }
  });

  // useBalance doesn't poll on its own, so nudge it every block to keep the
  // figure in sync with on-chain state (deposits, withdrawals, gas spend).
  useWatchBlockNumber({
    onBlockNumber: () => {
      refetch();
    }
  });

  // No manual per-block refetch here: useBlockchainDataSync (mounted in
  // Providers) invalidates this query only when a transfer touches `address`.
  if (isLoading) {
    return <span className="h-4 w-16 animate-pulse rounded bg-gray-200" aria-label="Loading balance" />;
  }

  if (!data) return null;

  return (
    <span className="text-sm font-medium text-gray-700">
      {Number(data.formatted).toFixed(4)} {data.symbol}
    </span>
  );
}

export default BalanceDisplay;
