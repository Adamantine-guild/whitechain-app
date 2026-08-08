import { test, expect } from './fixtures';

test.describe('Vault Deposit Flow (Synpress + MetaMask)', () => {
  test('Connect Wallet -> Navigate to Vault -> Input Amount -> Approve Token -> Deposit Token', async ({
    page,
    metamask,
    extensionId,
  }) => {
    await page.goto('/');

    const connectButton = page.getByRole('button', { name: 'Connect Wallet' });
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    const walletDialog = page.getByRole('dialog', { name: 'Connect a wallet' });
    await expect(walletDialog).toBeVisible();

    await walletDialog.getByRole('button', { name: 'MetaMask' }).click();

    await metamask.connectToDapp();

    await expect(
      page.locator('button:visible:not([aria-haspopup])').filter({ hasText: /0x[a-fA-F0-9]{4}\.{3}[a-fA-F0-9]{4}/ })
    ).toBeVisible({ timeout: 15000 });

    await page.goto('/dashboard');

    await page.waitForSelector('#vaults-desktop-table', { timeout: 10000 });

    const usdcVault = page.locator('tr').filter({ hasText: 'USDC Staking Vault' });
    await expect(usdcVault).toBeVisible();

    const stakeButton = usdcVault.getByRole('button', { name: 'Stake', exact: true });
    await expect(stakeButton).toBeVisible();
    await stakeButton.click();

    const inlineForm = page.locator('form').filter({ hasText: 'Enter amount to stake' });
    await expect(inlineForm).toBeVisible();

    const amountInput = inlineForm.locator('input[type="number"]');
    await amountInput.fill('1.5');

    const confirmButton = inlineForm.getByRole('button', { name: 'Confirm Stake' });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    const successBanner = page.getByText('Transaction succeeded and dashboard updated!');
    await expect(successBanner).toBeVisible({ timeout: 10000 });
  });
});
