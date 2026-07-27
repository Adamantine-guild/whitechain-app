import { z } from 'zod';

/** EIP-55-agnostic 20-byte hex address pattern. */
export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Upper bound for a sane gas limit (30M) — guards absurd values. */
export const MAX_GAS_LIMIT = 30_000_000n;
/** Lower bound for a valid gas limit. */
export const MIN_GAS_LIMIT = 21_000n;

export interface SendFormValues {
  to: string;
  amount: string;
  gasLimit: string;
}

/**
 * Builds a Zod schema for the Send Asset form. `balanceWei` is the user's
 * current balance in wei (string or bigint) used to enforce amount <= balance.
 * Validates, per issue #12:
 *  - address matches the 0x + 40-hex pattern
 *  - amount parses and is strictly > 0
 *  - amount <= balance
 *  - gasLimit is within [MIN_GAS_LIMIT, MAX_GAS_LIMIT]
 */
export function buildSendSchema(balanceWei: bigint) {
  return z
    .object({
      to: z
        .string()
        .trim()
        .min(1, 'Recipient address is required')
        .regex(ADDRESS_RE, 'Enter a valid 0x address (40 hex chars)'),
      amount: z
        .string()
        .trim()
        .min(1, 'Amount is required')
        .refine((v) => {
          try {
            return BigInt(v) > 0n;
          } catch {
            return false;
          }
        }, 'Amount must be greater than 0')
        .refine((v) => {
          try {
            return BigInt(v) <= balanceWei;
          } catch {
            return false;
          }
        }, 'Amount exceeds your balance'),
      gasLimit: z
        .string()
        .trim()
        .min(1, 'Gas limit is required')
        .refine((v) => {
          try {
            const g = BigInt(v);
            return g >= MIN_GAS_LIMIT && g <= MAX_GAS_LIMIT;
          } catch {
            return false;
          }
        }, `Gas limit must be between ${MIN_GAS_LIMIT} and ${MAX_GAS_LIMIT}`)
    })
    .refine(
      (val) => {
        try {
          return BigInt(val.amount) > 0n;
        } catch {
          return false;
        }
      },
      { message: 'Amount must be greater than 0', path: ['amount'] }
    );
}

export type SendSchema = ReturnType<typeof buildSendSchema>;
