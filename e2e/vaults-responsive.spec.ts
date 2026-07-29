import { test, expect } from '@playwright/test';

test.describe('Vault Dashboard Responsive Layout & Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to the dashboard page where the Vault Staking Dashboard resides
    await page.goto('/dashboard');
  });

  test('Desktop View: renders traditional table and hides mobile cards', async ({ page }) => {
    // Set desktop resolution
    await page.setViewportSize({ width: 1280, height: 800 });

    const desktopTable = page.locator('#vaults-desktop-table');
    const mobileCards = page.locator('#vaults-mobile-cards');

    await expect(desktopTable).toBeVisible();
    await expect(mobileCards).toBeHidden();

    // Verify presence of table headers
    await expect(desktopTable.locator('th').filter({ hasText: 'Vault' })).toBeVisible();
    await expect(desktopTable.locator('th').filter({ hasText: 'APY' })).toBeVisible();
    await expect(desktopTable.locator('th').filter({ hasText: 'Your Stake' })).toBeVisible();
  });

  test('Desktop View: expanding and submitting the stake form inline', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const usdcRow = page.locator('tr').filter({ hasText: 'USDC Staking Vault' });
    const stakeBtn = usdcRow.getByRole('button', { name: 'Stake', exact: true });

    // Open staking form inline
    await stakeBtn.click();

    // Confirm inline form is visible
    const inlineForm = page.locator('form').filter({ hasText: 'Enter amount to stake' });
    await expect(inlineForm).toBeVisible();

    // Verify touch target size of input and confirm button is >= 48px height
    const inputField = inlineForm.locator('input[type="number"]');
    const confirmBtn = inlineForm.getByRole('button', { name: 'Confirm Stake' });

    const inputBBox = await inputField.boundingBox();
    const btnBBox = await confirmBtn.boundingBox();

    expect(inputBBox?.height).toBeGreaterThanOrEqual(48);
    expect(btnBBox?.height).toBeGreaterThanOrEqual(48);

    // Simulate input and submit
    await inputField.fill('1.5');
    await confirmBtn.click();

    // Verify success banner is shown
    await expect(page.getByText('Transaction succeeded and dashboard updated!')).toBeVisible();
  });

  test('Mobile View (iPhone SE): renders cards, hides table, and has no horizontal overflow', async ({ page }) => {
    // iPhone SE viewport (375x667)
    await page.setViewportSize({ width: 375, height: 667 });

    const desktopTable = page.locator('#vaults-desktop-table');
    const mobileCards = page.locator('#vaults-mobile-cards');

    await expect(desktopTable).toBeHidden();
    await expect(mobileCards).toBeVisible();

    // Check for horizontal overflow
    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScrollbar).toBe(false);

    // Verify Card structure and action button touch target size
    const firstCard = mobileCards.locator('article').first();
    await expect(firstCard).toBeVisible();

    const stakeBtn = firstCard.getByRole('button', { name: 'Stake', exact: true });
    const btnBBox = await stakeBtn.boundingBox();
    expect(btnBBox?.height).toBeGreaterThanOrEqual(48);
    expect(btnBBox?.width).toBeGreaterThanOrEqual(48);
  });

  test('Tablet View (iPad): renders properly with no horizontal overflow', async ({ page }) => {
    // iPad viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });

    // In 768px view, it should show the desktop table (since md threshold is 768px in Tailwind)
    const desktopTable = page.locator('#vaults-desktop-table');
    await expect(desktopTable).toBeVisible();

    // Check for horizontal overflow
    const hasHorizontalScrollbar = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScrollbar).toBe(false);
  });
});
