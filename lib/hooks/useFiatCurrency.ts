/**
 * useFiatCurrency hook
 *
 * Convenience hook that wraps the fiat currency store and the formatter,
 * providing a single entry point for components that display fiat values.
 *
 * Usage:
 * ```tsx
 * const { currency, setCurrency, format } = useFiatCurrency();
 * <span>{format(1234.56)}</span>   // → "$1,234.56"
 * <span>{format(stats.totalTvl)}</span>
 * ```
 */

'use client';

import { useFiatCurrencyStore } from '@/lib/store/fiatCurrencyStore';
import { formatCurrency, type FiatCurrency } from '@/src/utils/format';

export function useFiatCurrency() {
  const currency = useFiatCurrencyStore((s) => s.currency);
  const setCurrency = useFiatCurrencyStore((s) => s.setCurrency);

  const format = (value: number | null | undefined) =>
    formatCurrency(value, currency);

  return { currency, setCurrency, format } as const;
}