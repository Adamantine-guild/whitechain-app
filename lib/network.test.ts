/**
 * network.test.ts
 *
 * Tests for lib/network.ts. Verifies:
 *  - requestSwitchChain calls wallet_switchEthereumChain with the correct hex id
 *  - requestAddChain calls wallet_addEthereumChain with the EIP-3085 descriptor
 *  - requestSwitchChain throws a clear error when no wallet is present
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestSwitchChain, requestAddChain, TARGET_CHAIN } from './network';

const CHAIN_HEX = `0x${TARGET_CHAIN.id.toString(16)}`;

describe('network switch helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (window as unknown as { ethereum?: unknown }).ethereum = undefined;
  });

  it('requestSwitchChain calls wallet_switchEthereumChain with target hex id', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { ethereum: { request: typeof request } }).ethereum = { request };

    await requestSwitchChain();

    expect(request).toHaveBeenCalledWith({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_HEX }]
    });
  });

  it('requestAddChain calls wallet_addEthereumChain with the chain descriptor', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    (window as unknown as { ethereum: { request: typeof request } }).ethereum = { request };

    await requestAddChain();

    const call = request.mock.calls[0][0] as { method: string; params: unknown[] };
    expect(call.method).toBe('wallet_addEthereumChain');
    const descriptor = call.params[0] as { chainId: string };
    expect(descriptor.chainId).toBe(CHAIN_HEX);
  });

  it('throws a clear error when no injected wallet exists', async () => {
    await expect(requestSwitchChain()).rejects.toThrow(/No injected wallet/i);
  });
});
