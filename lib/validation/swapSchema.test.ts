/**
 * swapSchema.test.ts
 *
 * Tests for lib/validation/swapSchema.ts.
 * Verifies the Zod rules for the Swap form:
 *  - amountIn is a positive decimal number
 *  - amountIn respects decimal precision
 *  - tokenIn and tokenOut are non-empty
 *  - tokenIn !== tokenOut
 */

import { describe, it, expect } from 'vitest';
import { swapSchema, MIN_SWAP_AMOUNT, MAX_DECIMALS } from './swapSchema';

describe('swapSchema', () => {
  it('accepts a valid swap payload', () => {
    const res = swapSchema.safeParse({
      amountIn: '100',
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(true);
  });

  it('accepts a valid decimal amount', () => {
    const res = swapSchema.safeParse({
      amountIn: '0.001',
      tokenIn: 'ETH',
      tokenOut: 'USDC',
    });
    expect(res.success).toBe(true);
  });

  it('rejects empty amount', () => {
    const res = swapSchema.safeParse({
      amountIn: '',
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toContain('amountIn');
  });

  it('rejects zero amount', () => {
    const res = swapSchema.safeParse({
      amountIn: '0',
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/greater than 0/);
    }
  });

  it('rejects negative amount', () => {
    const res = swapSchema.safeParse({
      amountIn: '-50',
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/greater than 0/);
    }
  });

  it('rejects amount below minimum', () => {
    const res = swapSchema.safeParse({
      amountIn: String(MIN_SWAP_AMOUNT / 10),
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/Minimum/);
    }
  });

  it('rejects amount with too many decimal places', () => {
    const res = swapSchema.safeParse({
      amountIn: `0.${'1'.repeat(MAX_DECIMALS + 1)}`,
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/decimal/);
    }
  });

  it('rejects same token for in and out', () => {
    const res = swapSchema.safeParse({
      amountIn: '100',
      tokenIn: 'USDC',
      tokenOut: 'USDC',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/different/);
    }
  });

  it('rejects empty token symbols', () => {
    const res = swapSchema.safeParse({
      amountIn: '100',
      tokenIn: '',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
  });

  it('rejects NaN amounts', () => {
    const res = swapSchema.safeParse({
      amountIn: 'abc',
      tokenIn: 'USDC',
      tokenOut: 'WBTC',
    });
    expect(res.success).toBe(false);
  });
});