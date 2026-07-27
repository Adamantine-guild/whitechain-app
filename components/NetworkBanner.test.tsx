/**
 * NetworkBanner.test.tsx
 *
 * Tests for components/NetworkBanner.tsx. Verifies issue #3 acceptance:
 *  - a prominent prompt appears when the wallet is on the wrong network
 *  - the "Switch Network" button triggers wallet_switchEthereumChain
 *  - nothing renders when already on the target chain
 *
 * `wagmi`'s useChainId is mocked (via a mutable hoisted value); the injected
 * wallet is stubbed on window.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NetworkBanner } from './NetworkBanner';
import { TARGET_CHAIN } from '@/lib/network';

const hoisted = vi.hoisted(() => ({ chainId: 999 }));
vi.mock('wagmi', () => ({ useChainId: () => hoisted.chainId }));

describe('NetworkBanner', () => {
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hoisted.chainId = 999;
    request = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { ethereum: { request: typeof request } }).ethereum = { request };
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    (window as unknown as { ethereum?: unknown }).ethereum = undefined;
  });

  it('prompts the user when on the wrong network', () => {
    render(<NetworkBanner />);
    expect(screen.getByText(/wrong network/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Switch Network/i })).toBeTruthy();
  });

  it('calls wallet_switchEthereumChain on click', async () => {
    render(<NetworkBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Switch Network/i }));
    await Promise.resolve();
    expect(request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${TARGET_CHAIN.id.toString(16)}` }]
    });
  });

  it('renders nothing on the correct network', () => {
    hoisted.chainId = TARGET_CHAIN.id;
    render(<NetworkBanner />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
