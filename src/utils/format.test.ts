import { describe, expect, it } from 'vitest';
import { formatCurrency } from './format';

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
  });
});
