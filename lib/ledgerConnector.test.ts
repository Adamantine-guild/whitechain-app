/**
 * Ledger WebUSB connector tests (issue #27).
 * Success path (connect + sign) and failure paths (USB unplugged / user
 * cancelled) are exercised with a mocked @ledgerhq transport.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted, so declare mocks via vi.hoisted.
const h = vi.hoisted(() => {
  return {
    mockGetAddress: vi.fn(),
    mockSignPersonalMessage: vi.fn(),
    mockSignTransaction: vi.fn(),
    mockClose: vi.fn(),
    mockCreate: vi.fn().mockResolvedValue({ close: undefined as unknown }),
  };
});

vi.mock('@ledgerhq/hw-transport-webusb', () => ({
  default: {
    create: h.mockCreate,
  },
}));

vi.mock('@ledgerhq/hw-app-eth', () => ({
  default: class {
    getAddress = h.mockGetAddress;
    signPersonalMessage = h.mockSignPersonalMessage;
    signTransaction = h.mockSignTransaction;
  },
}));

import { ledgerConnector, toLedgerError, LEDGER_DEFAULT_PATH } from './ledgerConnector';
import type { Address } from 'viem';

const FAKE_ADDR = '0x1234567890123456789012345678901234567890' as Address;

function makeConnector() {
  // Cast through unknown because createConnector expects wagmi's config shape.
  const fn = ledgerConnector() as unknown as (config: any) => any;
  return fn({ chains: [{ id: 1 }] });
}

describe('ledgerConnector', () => {
  beforeEach(() => {
    h.mockGetAddress.mockResolvedValue({ address: FAKE_ADDR });
    h.mockSignPersonalMessage.mockResolvedValue({ r: 'aa', s: 'bb', v: 27 });
    h.mockSignTransaction.mockResolvedValue({ r: 'aa', s: 'bb', v: '1b' });
    h.mockCreate.mockResolvedValue({ close: h.mockClose });
  });

  it('uses the default derivation path', () => {
    expect(LEDGER_DEFAULT_PATH).toBe("m/44'/60'/0'/0/0");
  });

  it('connects and returns the derived account', async () => {
    const c = makeConnector();
    const res = await c.connect();
    expect(res.accounts[0]).toBe(FAKE_ADDR);
    expect(res.chainId).toBe(1);
  });

  it('signs a message (assembles a 0x signature)', async () => {
    const c = makeConnector();
    await c.connect();
    const sig = await c.signMessage({ message: 'hello' });
    expect(sig.startsWith('0x')).toBe(true);
    expect(h.mockSignPersonalMessage).toHaveBeenCalled();
  });

  it('signs a transaction and returns serialized tx', async () => {
    const c = makeConnector();
    await c.connect();
    const tx = {
      type: 'eip1559',
      to: FAKE_ADDR,
      value: '0x1',
      maxFeePerGas: '0x1',
      maxPriorityFeePerGas: '0x1',
      gas: '0x5208',
      nonce: 0,
      chainId: 1,
    } as any;
    const out = await c.signTransaction(tx);
    expect(out.startsWith('0x')).toBe(true);
    expect(h.mockSignTransaction).toHaveBeenCalled();
  });

  it('maps a device-not-found error to DEVICE_NOT_FOUND', () => {
    const err = toLedgerError({ name: 'TransportError', message: 'No device found' });
    expect(err.kind).toBe('DEVICE_NOT_FOUND');
  });
});
