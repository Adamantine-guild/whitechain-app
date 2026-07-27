import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXPLORER_CHAIN_ID,
  getExplorerBaseUrl,
  getExplorerLink
} from './explorer';

const TX_HASH = '0xabc123';
const ADDRESS = '0xdef456';
const BLOCK = '19000000';

describe('getExplorerLink', () => {
  it('links a tx hash to mainnet etherscan on chain 1', () => {
    expect(getExplorerLink(TX_HASH, 'tx', 1)).toBe(`https://etherscan.io/tx/${TX_HASH}`);
  });

  it('links a tx hash to the sepolia explorer on chain 11155111', () => {
    expect(getExplorerLink(TX_HASH, 'tx', 11155111)).toBe(
      `https://sepolia.etherscan.io/tx/${TX_HASH}`
    );
  });

  it('links a tx hash to the goerli explorer on chain 5', () => {
    expect(getExplorerLink(TX_HASH, 'tx', 5)).toBe(`https://goerli.etherscan.io/tx/${TX_HASH}`);
  });

  it('supports the address type', () => {
    expect(getExplorerLink(ADDRESS, 'address', 11155111)).toBe(
      `https://sepolia.etherscan.io/address/${ADDRESS}`
    );
  });

  it('supports the block type', () => {
    expect(getExplorerLink(BLOCK, 'block', 11155111)).toBe(
      `https://sepolia.etherscan.io/block/${BLOCK}`
    );
  });

  it('falls back to the default chain explorer for an unknown chainId', () => {
    expect(getExplorerLink(TX_HASH, 'tx', 999999)).toBe(
      `${getExplorerBaseUrl(DEFAULT_EXPLORER_CHAIN_ID)}/tx/${TX_HASH}`
    );
  });
});

describe('getExplorerBaseUrl', () => {
  it('returns the network specific base url', () => {
    expect(getExplorerBaseUrl(1)).toBe('https://etherscan.io');
    expect(getExplorerBaseUrl(11155111)).toBe('https://sepolia.etherscan.io');
  });
});
