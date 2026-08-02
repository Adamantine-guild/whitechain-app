import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLIPPAGE,
  PRESET_SLIPPAGE_VALUES,
  SLIPPAGE_WARNING_THRESHOLD,
  SLIPPAGE_MAX,
  SLIPPAGE_MIN,
  validateSlippageInput,
  isSlippageRisky
} from './userSettingsStore';

describe('constants', () => {
  it('has a default slippage of 0.5 %', () => {
    expect(DEFAULT_SLIPPAGE).toBe(0.5);
  });

  it('has preset values [0.1, 0.5, 1.0]', () => {
    expect(PRESET_SLIPPAGE_VALUES).toEqual([0.1, 0.5, 1.0]);
  });

  it('has a warning threshold of 2 %', () => {
    expect(SLIPPAGE_WARNING_THRESHOLD).toBe(2);
  });

  it('has a max of 50 %', () => {
    expect(SLIPPAGE_MAX).toBe(50);
  });

  it('has a min of 0 %', () => {
    expect(SLIPPAGE_MIN).toBe(0);
  });
});

describe('validateSlippageInput', () => {
  it('rejects empty input', () => {
    const result = validateSlippageInput('');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('empty');
  });

  it('rejects bare dot', () => {
    const result = validateSlippageInput('.');
    expect(result.valid).toBe(false);
  });

  it('rejects multiple dots', () => {
    const result = validateSlippageInput('1.2.3');
    expect(result.valid).toBe(false);
  });

  it('rejects negative values', () => {
    const result = validateSlippageInput('-1');
    expect(result.valid).toBe(false);
  });

  it('rejects values above max', () => {
    const result = validateSlippageInput('51');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.message).toContain('50');
  });

  it('accepts 0', () => {
    expect(validateSlippageInput('0').valid).toBe(true);
  });

  it('accepts 0.5', () => {
    expect(validateSlippageInput('0.5').valid).toBe(true);
  });

  it('accepts 50 (the max)', () => {
    expect(validateSlippageInput('50').valid).toBe(true);
  });

  it('accepts trailing decimal point (in-progress edit)', () => {
    expect(validateSlippageInput('5.').valid).toBe(true);
  });
});

describe('isSlippageRisky', () => {
  it('returns false for default slippage (0.5 %)', () => {
    expect(isSlippageRisky(0.5)).toBe(false);
  });

  it('returns false for 1 %', () => {
    expect(isSlippageRisky(1)).toBe(false);
  });

  it('returns false for exactly the threshold (2 % — not yet risky)', () => {
    expect(isSlippageRisky(SLIPPAGE_WARNING_THRESHOLD)).toBe(false);
  });

  it('returns true for 3 % (above threshold)', () => {
    expect(isSlippageRisky(3)).toBe(true);
  });

  it('returns true for 5 %', () => {
    expect(isSlippageRisky(5)).toBe(true);
  });

  it('returns true for 10 %', () => {
    expect(isSlippageRisky(10)).toBe(true);
  });

  it('returns true for 50 % (the max)', () => {
    expect(isSlippageRisky(SLIPPAGE_MAX)).toBe(true);
  });

  it('returns false for values above max (clamped by store)', () => {
    expect(isSlippageRisky(51)).toBe(false);
  });
});