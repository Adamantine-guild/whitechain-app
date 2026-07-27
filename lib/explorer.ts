export type ExplorerLinkType = 'tx' | 'address' | 'block';

export const DEFAULT_EXPLORER_CHAIN_ID = 1;

export const EXPLORER_BASE_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  5: 'https://goerli.etherscan.io',
  11155111: 'https://sepolia.etherscan.io'
};

const PATH_SEGMENTS: Record<ExplorerLinkType, string> = {
  tx: 'tx',
  address: 'address',
  block: 'block'
};

export function getExplorerBaseUrl(chainId: number): string {
  return EXPLORER_BASE_URLS[chainId] ?? EXPLORER_BASE_URLS[DEFAULT_EXPLORER_CHAIN_ID];
}

export function getExplorerLink(hash: string, type: ExplorerLinkType, chainId: number): string {
  return `${getExplorerBaseUrl(chainId)}/${PATH_SEGMENTS[type]}/${hash}`;
}
