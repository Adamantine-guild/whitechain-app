// Client-Side Form Validation for Staking Inputs
// Solves whitechain-app Issue #69 ($100 USDC Bounty)

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateStakingInput(amount: string, userBalance: number): ValidationResult {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return { isValid: false, error: 'Please enter a valid positive staking amount.' };
  }
  if (parsed > userBalance) {
    return { isValid: false, error: 'Insufficient wallet balance for this staking amount.' };
  }
  return { isValid: true };
}
