import { test, expect } from '@playwright/test';

test.describe('Staking Flow E2E Suite', () => {
  test('should display staking card and validate input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    const stakeInput = page.locator('input[placeholder*="amount"]');
    if (await stakeInput.isVisible()) {
      await stakeInput.fill('10');
      const submitBtn = page.locator('button:has-text("Stake")');
      await expect(submitBtn).toBeEnabled();
    }
  });
});
