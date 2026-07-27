import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

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
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
    [sepolia.id]: http()
  }
});