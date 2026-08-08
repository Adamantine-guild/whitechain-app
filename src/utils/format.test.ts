import { describe, expect, it, beforeEach, vi } from 'vitest';
import { formatCurrency, SUPPORTED_FIAT_CURRENCIES, DEFAULT_FIAT_CURRENCY, type FiatCurrency } from './format';

describe('formatCurrency', () => {
  it('formats standard fiat values with commas and 2 decimals', () => {
    expect(formatCurrency(1000000)).toMatch(/\$1,000,000\.00/);
    expect(formatCurrency(1234.5)).toMatch(/\$1,234\.50/);
  });

  it('handles small amounts intelligently (< $0.01)', () => {
    expect(formatCurrency(0.005)).toBe('< $0.01');
    expect(formatCurrency(0.0001)).toBe('< $0.01');
  });

  it('handles zero correctly', () => {
    expect(formatCurrency(0)).toMatch(/\$0\.00/);
  });

  it('safely handles null, undefined, and NaN inputs', () => {
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
    expect(formatCurrency(NaN)).toBe('$0.00');
  });

  it('supports custom currency codes', () => {
    const formattedEUR = formatCurrency(100, 'EUR');
    expect(formattedEUR).toContain('100');
    expect(formattedEUR).toContain('€');
  });

  it('formats EUR correctly with Intl.NumberFormat', () => {
    const result = formatCurrency(1500.5, 'EUR');
    // Should contain the euro symbol and proper formatting
    expect(result).toContain('€');
    expect(result).toContain('1');
    expect(result).toContain('500');
  });

  it('formats JPY correctly (no decimal places)', () => {
    const result = formatCurrency(5000, 'JPY');
    expect(result).toContain('5,000');
  });

  it('formats GBP correctly', () => {
    const result = formatCurrency(99.99, 'GBP');
    expect(result).toContain('£');
    expect(result).toContain('99');
  });

  it('handles small amounts with non-USD currencies', () => {
    const result = formatCurrency(0.005, 'EUR');
    expect(result).toMatch(/<\s*€?\s*0\.01/);
  });

  it('handles negative values', () => {
    const result = formatCurrency(-50.5);
    expect(result).toContain('-');
    expect(result).toContain('50');
  });

  it('has DEFAULT_FIAT_CURRENCY set to USD', () => {
    expect(DEFAULT_FIAT_CURRENCY).toBe('USD');
  });

  it('SUPPORTED_FIAT_CURRENCIES includes major currencies', () => {
    const codes = SUPPORTED_FIAT_CURRENCIES.map((c) => c.code);
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
    expect(codes).toContain('GBP');
    expect(codes).toContain('JPY');
    expect(codes).toContain('CNY');
    expect(codes).toContain('BRL');
  });

  it('each SUPPORTED_FIAT_CURRENCY entry has all required fields', () => {
    for (const entry of SUPPORTED_FIAT_CURRENCIES) {
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('label');
      expect(entry).toHaveProperty('symbol');
      expect(entry).toHaveProperty('locale');
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.label).toBe('string');
      expect(typeof entry.symbol).toBe('string');
      expect(typeof entry.locale).toBe('string');
    }
  });
});