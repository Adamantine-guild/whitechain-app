/**
 * Fiat currency formatting utilities.
 *
 * The default export is `formatCurrency`, which formats a numeric value as a
 * fiat currency string using `Intl.NumberFormat`.  It supports:
 *
 * - Standard USD formatting with commas and 2 decimals
 * - Small amounts (< $0.01) displayed as `"< $0.01"`
 * - Safe handling of null, undefined, and NaN
 * - Custom currency codes via the second argument
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported fiat currency codes for display. */
export type FiatCurrency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'CHF'
  | 'CNY'
  | 'INR'
  | 'KRW'
  | 'MXN'
  | 'BRL';

/** All supported currencies with their display labels. */
export const SUPPORTED_FIAT_CURRENCIES: {
  code: FiatCurrency;
  label: string;
  symbol: string;
  locale: string;
}[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', label: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', label: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$', locale: 'en-CA' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'MX$', locale: 'es-MX' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
];

/** Default currency when no preference is set. */
export const DEFAULT_FIAT_CURRENCY: FiatCurrency = 'USD';

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Format a numeric value as a fiat currency string.
 *
 * @param value  - The numeric value to format.  `null`, `undefined`, and
 *                 `NaN` are treated as `0`.
 * @param currency - ISO 4217 currency code (default `'USD'`).
 * @returns A formatted currency string (e.g. `"$1,234.50"`).
 *
 * Special cases:
 * - Values between `0.01` and `0` (exclusive) are displayed as `"< $0.01"`
 *   (or the equivalent in the given currency).
 * - Zero is always `"$0.00"` (or the equivalent).
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: FiatCurrency = 'USD',
): string {
  // Normalise null / undefined / NaN to 0.
  const safeValue =
    value === null || value === undefined || Number.isNaN(value)
      ? 0
      : value;

  // Tiny-but-non-zero: show "< $0.01" (or equivalent).
  if (safeValue > 0 && safeValue < 0.01) {
    if (currency === 'USD') return '< $0.01';
    const entry = SUPPORTED_FIAT_CURRENCIES.find((c) => c.code === currency);
    if (entry) return `< ${entry.symbol}0.01`;
    return `< ${currency} 0.01`;
  }

  // Standard formatting with Intl.NumberFormat.
  try {
    const entry = SUPPORTED_FIAT_CURRENCIES.find((c) => c.code === currency);
    const locale = entry?.locale ?? 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);
  } catch {
    // Fallback for unsupported currency codes.
    return `${currency} ${safeValue.toFixed(2)}`;
  }
}