/**
 * sendSchema.test.ts
 *
 * Tests for lib/validation/sendSchema.ts. Verifies the Zod rules from issue #12:
 *  - address regex
 *  - amount > 0
 *  - amount <= balance
 *  - gas limit bounds
 *
 * Run: `npm run test`
 */

import { describe, it, expect } from 'vitest';
import { buildSendSchema, ADDRESS_RE, MIN_GAS_LIMIT, MAX_GAS_LIMIT } from './sendSchema';

const GOOD_ADDR = '0x' + 'a'.repeat(40);
const balance = 1000n;
const schema = buildSendSchema(balance);

describe('sendSchema', () => {
  it('accepts a valid payload', () => {
    const res = schema.safeParse({ to: GOOD_ADDR, amount: '500', gasLimit: '21000' });
    expect(res.success).toBe(true);
  });

  it('rejects a malformed address', () => {
    const res = schema.safeParse({ to: 'not-an-address', amount: '500', gasLimit: '21000' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toContain('to');
  });

  it('rejects a negative / zero amount', () => {
    const res = schema.safeParse({ to: GOOD_ADDR, amount: '0', gasLimit: '21000' });
    expect(res.success).toBe(false);
  });

  it('rejects an amount above the balance', () => {
    const res = schema.safeParse({ to: GOOD_ADDR, amount: '1001', gasLimit: '21000' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].message).toMatch(/balance/i);
  });

  it('rejects an out-of-range gas limit', () => {
    const tooLow = schema.safeParse({ to: GOOD_ADDR, amount: '10', gasLimit: '1' });
    const tooHigh = schema.safeParse({
      to: GOOD_ADDR,
      amount: '10',
      gasLimit: (MAX_GAS_LIMIT + 1n).toString()
    });
    expect(tooLow.success).toBe(false);
    expect(tooHigh.success).toBe(false);
  });

  it('address regex matches 40 hex chars', () => {
    expect(ADDRESS_RE.test(GOOD_ADDR)).toBe(true);
    expect(ADDRESS_RE.test('0x' + 'g'.repeat(40))).toBe(false);
    expect(MIN_GAS_LIMIT).toBe(21000n);
  });
});
