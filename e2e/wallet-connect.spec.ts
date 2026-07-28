import { test, expect, type Page } from '@playwright/test';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

// Mocks a minimal EIP-1193 injected provider so wagmi's injected()
// connector (lib/wagmi.ts) detects a wallet without needing a real
// browser extension. Covers acceptance criterion: "Mocks wallet injection
// cleanly using browser extension state mocking."
async function mockInjectedWallet(page: Page) {
  await page.addInitScript((address) => {
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const mockProvider = {
      isMetaMask: false,
      request: async ({ method }: { method: string }) => {
        switch (method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [address];
          case 'eth_chainId':
            return '0x1';
          default:
            return null;
        }
      },
      on: (event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
      },
      removeListener: (event: string, handler: (...args: unknown[]) => void) => {
        listeners[event] = (listeners[event] || []).filter((h) => h !== handler);
      },
    };
    Object.defineProperty(window, 'ethereum', {
      value: mockProvider,
      writable: true,
      configurable: true,
    });
  }, MOCK_ADDRESS);
}

test.describe('Wallet connection', () => {
  test('shows "Connect Wallet" when no wallet is connected', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  });

  test('opens the wallet modal and lists available connectors', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connect Wallet' }).click();

    const dialog = page.getByRole('dialog', { name: 'Connect a wallet' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button')).not.toHaveCount(0);
  });

  test('closes the wallet modal on Escape', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Connect Wallet' }).click();
    await expect(page.getByRole('dialog', { name: 'Connect a wallet' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Connect a wallet' })).toBeHidden();
  });

  test('connects via a mocked injected wallet provider', async ({ page }) => {
    await mockInjectedWallet(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Connect Wallet' }).click();
    const dialog = page.getByRole('dialog', { name: 'Connect a wallet' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Injected' }).click();

 await expect(
  page.locator('button:visible:not([aria-haspopup])').filter({ hasText: /0x1234\.\.\.7890/ })
).toBeVisible();

  });
});
