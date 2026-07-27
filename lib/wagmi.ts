import { createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { createTransport, parseRpcUrls } from './transport';

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

const mainnetRpcUrls = parseRpcUrls(
  process.env.NEXT_PUBLIC_MAINNET_RPC_URLS ?? process.env.NEXT_PUBLIC_RPC_URL
);
const sepoliaRpcUrls = parseRpcUrls(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URLS);

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  // Defers reading persisted connector state until after hydration, so the
  // client's first render matches what the server rendered.
  ssr: true,
  connectors: [
    injected(),
    coinbaseWallet({ appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'WhiteChain' }),
    ...(walletConnectProjectId
      ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
      : [])
  ],
  transports: {
    [mainnet.id]: createTransport(mainnetRpcUrls),
    [sepolia.id]: createTransport(sepoliaRpcUrls)
  }
});