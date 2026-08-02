import { z } from 'zod';

/** Maximum decimal places for human-readable token amounts. */
export const MAX_DECIMALS = 18;

/** Minimum swap amount in human-readable form (> 0). */
export const MIN_SWAP_AMOUNT = 0.000001;

/**
 * Zod schema for the Swap form.
 *
 * Validates:
 *  - amountIn is a positive decimal string that can be parsed as a number
 *  - amountIn is within a reasonable range
 *  - tokenIn and tokenOut are non-empty symbol strings
 */
export const swapSchema = z
  .object({
    amountIn: z
      .string()
      .trim()
      .min(1, 'Swap amount is required')
      .refine(
        (v) => {
          const n = Number(v);
          return !Number.isNaN(n) && n > 0;
        },
        { message: 'Amount must be greater than 0' }
      )
      .refine(
        (v) => {
          const n = Number(v);
          return n >= MIN_SWAP_AMOUNT;
        },
        { message: `Minimum swap amount is ${MIN_SWAP_AMOUNT}` }
      )
      .refine(
        (v) => {
          const parts = v.split('.');
          if (parts.length !== 2) return true; // integer is fine
          return parts[1].length <= MAX_DECIMALS;
        },
        { message: `Amount can have at most ${MAX_DECIMALS} decimal places` }
      ),
    tokenIn: z.string().min(1, 'Source token is required'),
    tokenOut: z.string().min(1, 'Destination token is required'),
  })
  .refine(
    (val) => val.tokenIn !== val.tokenOut,
    { message: 'Source and destination tokens must be different', path: ['tokenOut'] }
  );

export type SwapFormValues = z.infer<typeof swapSchema>;