import { useAccount, useBalance } from 'wagmi';
import { useTranslation } from 'react-i18next';

const BalanceDisplay = () => {
  const { t } = useTranslation();
  const { address } = useAccount();
  const { data, isLoading } = useBalance({
    address,
    query: { refetchOnWindowFocus: false }
  });

  // No manual per-block refetch here: useBlockchainDataSync (mounted in
  // Providers) invalidates this query only when a transfer touches `address`.
  if (isLoading) {
    return <span className="h-4 w-16 animate-pulse rounded bg-gray-200" aria-label={t('balance.loading')} />;
  }

  if (!data) return null;

  return (
    <span className="text-sm font-medium text-gray-700">
      {Number(data.formatted).toFixed(4)} {data.symbol}
    </span>
  );
}

export default BalanceDisplay;
