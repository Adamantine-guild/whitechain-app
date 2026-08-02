/**
 * simulatorSchema.test.ts
 *
 * Tests for lib/validation/simulatorSchema.ts.
 * Verifies the Zod rules for the Transaction Simulator:
 *  - to is a valid 0x + 40 hex EVM address
 *  - value (optional) is a non-negative integer within bounds
 */

import { describe, it, expect } from 'vitest';
import { simulatorSchema, ADDRESS_RE, MAX_VALUE_WEI } from './simulatorSchema';

const GOOD_ADDR = '0x' + 'a'.repeat(40);

describe('simulatorSchema', () => {
  it('accepts a valid address with no value', () => {
    const res = simulatorSchema.safeParse({ to: GOOD_ADDR, value: '' });
    expect(res.success).toBe(true);
  });

  it('accepts a valid address with a value', () => {
    const res = simulatorSchema.safeParse({ to: GOOD_ADDR, value: '1000000' });
    expect(res.success).toBe(true);
  });

  it('accepts zero value', () => {
    const res = simulatorSchema.safeParse({ to: GOOD_ADDR, value: '0' });
    expect(res.success).toBe(true);
  });

  it('rejects a malformed address', () => {
    const res = simulatorSchema.safeParse({ to: 'not-an-address', value: '' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toContain('to');
  });

  it('rejects a short address', () => {
    const res = simulatorSchema.safeParse({ to: '0x1234', value: '' });
    expect(res.success).toBe(false);
  });

  it('rejects a missing address', () => {
    const res = simulatorSchema.safeParse({ to: '', value: '' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/required/);
    }
  });

  it('rejects negative value', () => {
    const res = simulatorSchema.safeParse({ to: GOOD_ADDR, value: '-100' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/non-negative|integer/);
    }
  });

  it('rejects decimal value', () => {
    const res = simulatorSchema.safeParse({ to: GOOD_ADDR, value: '1.5' });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/non-negative|integer/);
    }
  });

  it('rejects overflow value', () => {
    const res = simulatorSchema.safeParse({
      to: GOOD_ADDR,
      value: (MAX_VALUE_WEI + 1n).toString(),
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      const msg = res.error.issues.map((i) => i.message).join(' ');
      expect(msg).toMatch(/exceeds|maximum/);
    }
  });

  it('address regex matches 40 hex chars', () => {
    expect(ADDRESS_RE.test(GOOD_ADDR)).toBe(true);
    expect(ADDRESS_RE.test('0x' + 'g'.repeat(40))).toBe(false);
    expect(ADDRESS_RE.test('0x' + 'a'.repeat(39))).toBe(false);
  });
});