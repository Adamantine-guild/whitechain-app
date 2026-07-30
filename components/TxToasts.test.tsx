/**
 * TxToasts.test.tsx
 *
 * Tests for components/TxToasts.tsx (issue #5). Verifies the acceptance
 * criteria: success toast includes a link to the block explorer and
 * auto-dismisses after 5 seconds.
 *
 * `sonner` is mocked so we can assert on the toast calls without rendering
 * the real DOM toaster.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Chain, type Hash } from 'viem';

const toastMock = {
  loading: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: toastMock,
}));

// Import after the mock is registered.
const { explorerTxUrl, notifyTxSuccess, notifyTxError, notifyTxPending } = await import(
  './TxToasts'
);

const CHAIN_WITH_EXPLORER: Chain = {
  id: 1,
  name: 'Mock',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://example.com'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://etherscan.io' } },
} as unknown as Chain;

const CHAIN_NO_EXPLORER: Chain = {
  id: 999,
  name: 'NoExplorer',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://example.com'] } },
} as unknown as Chain;

const TX_HASH =
  '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' as Hash;

describe('explorerTxUrl', () => {
  it('builds a tx URL from the chain explorer base + hash', () => {
    expect(explorerTxUrl(CHAIN_WITH_EXPLORER, TX_HASH)).toBe(
      'https://etherscan.io/tx/0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    );
  });

  it('returns null when the chain has no block explorer', () => {
    expect(explorerTxUrl(CHAIN_NO_EXPLORER, TX_HASH)).toBeNull();
  });

  it('returns null when chain is undefined', () => {
    expect(explorerTxUrl(undefined, TX_HASH)).toBeNull();
  });
});

describe('notifyTxSuccess', () => {
  beforeEach(() => {
    toastMock.success.mockClear();
  });

  it('auto-dismisses after 5 seconds (duration: 5000)', () => {
    notifyTxSuccess(TX_HASH, CHAIN_WITH_EXPLORER);
    expect(toastMock.success).toHaveBeenCalledTimes(1);
    const opts = toastMock.success.mock.calls[0][1];
    expect(opts.duration).toBe(5000);
  });

  it('includes an explorer action link for a real tx hash', () => {
    notifyTxSuccess(TX_HASH, CHAIN_WITH_EXPLORER);
    const opts = toastMock.success.mock.calls[0][1];
    expect(opts.action).toBeDefined();
    expect(opts.action.label).toBe('View on explorer');
  });

  it('omits the explorer action when there is no explorer configured', () => {
    notifyTxSuccess(TX_HASH, CHAIN_NO_EXPLORER);
    const opts = toastMock.success.mock.calls[0][1];
    expect(opts.action).toBeUndefined();
  });

  it('omits the explorer action for a non-real hash', () => {
    notifyTxSuccess('0x0' as Hash, CHAIN_WITH_EXPLORER);
    const opts = toastMock.success.mock.calls[0][1];
    expect(opts.action).toBeUndefined();
  });
});

describe('notifyTxError / notifyTxPending', () => {
  beforeEach(() => {
    toastMock.error.mockClear();
    toastMock.loading.mockClear();
  });

  it('notifyTxError surfaces the message', () => {
    notifyTxError('User rejected');
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(toastMock.error.mock.calls[0][1].description).toBe('User rejected');
  });

  it('notifyTxError requires manual dismissal (duration: Infinity)', () => {
    notifyTxError('User rejected');
    expect(toastMock.error.mock.calls[0][1].duration).toBe(Infinity);
  });

  it('notifyTxPending shows a loading toast', () => {
    notifyTxPending();
    expect(toastMock.loading).toHaveBeenCalledTimes(1);
  });
});
