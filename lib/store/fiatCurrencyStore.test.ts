import { describe, expect, it, beforeEach } from 'vitest';
import { useFiatCurrencyStore, type FiatCurrencyState } from './fiatCurrencyStore';

/**
 * Helper to read the store's current state outside a React component.
 */
function readStore(): FiatCurrencyState {
  return useFiatCurrencyStore.getState();
}

describe('useFiatCurrencyStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test.
    useFiatCurrencyStore.setState({ currency: 'USD' });
  });

  it('defaults to USD', () => {
    const { currency } = readStore();
    expect(currency).toBe('USD');
  });

  it('setCurrency updates the currency', () => {
    readStore().setCurrency('EUR');
    expect(readStore().currency).toBe('EUR');
  });

  it('setCurrency accepts all supported currencies', () => {
    const currencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'KRW', 'MXN', 'BRL'] as const;
    for (const c of currencies) {
      readStore().setCurrency(c);
      expect(readStore().currency).toBe(c);
    }
  });

  it('setCurrency is idempotent', () => {
    readStore().setCurrency('USD');
    readStore().setCurrency('USD');
    expect(readStore().currency).toBe('USD');
  });
});