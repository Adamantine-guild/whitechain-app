import { z } from 'zod';

/** EIP-55-agnostic 20-byte hex address pattern. */
export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Maximum value in wei (capped at 1e24 to prevent overflow in UI). */
export const MAX_VALUE_WEI = 10n ** 24n;

/**
 * Zod schema for the Transaction Simulator form.
 *
 * Validates:
 *  - to is a valid 0x + 40 hex-char EVM address
 *  - value (optional wei string) is a non-negative integer within bounds
 */
export const simulatorSchema = z.object({
  to: z
    .string()
    .trim()
    .min(1, 'Destination address is required')
    .regex(ADDRESS_RE, 'Enter a valid 0x address (40 hex chars)'),
  value: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine(
      (v) => {
        if (v === '' || v === undefined) return true;
        return /^[0-9]+$/.test(v);
      },
      { message: 'Value must be a non-negative integer (wei)' }
    )
    .refine(
      (v) => {
        if (v === '' || v === undefined) return true;
        try {
          return BigInt(v) >= 0n && BigInt(v) <= MAX_VALUE_WEI;
        } catch {
          return false;
        }
      },
      { message: 'Value exceeds maximum allowed (1e24 wei)' }
    ),
});

export type SimulatorFormValues = z.infer<typeof simulatorSchema>;