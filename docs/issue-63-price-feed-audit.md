# Issue #63 Audit — Real-Time WebSocket Price Feed Engine

## Finding
The issue describes a current state and file structure that don't match this repository:

1. **No src/ directory exists.** The issue's suggested paths
   (src/context/PriceContext.tsx, src/hooks/useRealTimePrice.ts,
   src/components/swap/PriceDisplay.tsx) don't correspond to this repo's
   actual layout, which uses root-level components/, pp/, and lib/.

2. **No token price fetching exists in this codebase**, static or otherwise.
   The only "price" reference in the codebase is \useGasPrice\ (wagmi gas
   price for transaction fees) in \SendModal.tsx\ — unrelated to token/market
   pricing. There is no REST call, price API, or price display component to
   replace with a WebSocket feed.

3. **No \PriceContext\, no \swap\ component folder, no oracle/price
   subscription logic** anywhere in \lib/\ or \components/\.

4. The closest existing real-time infrastructure is
   \lib/hooks/useBlockchainData.ts\ (\useBlockchainDataSync\), which watches
   new blocks via \publicClient.watchBlocks\ purely to invalidate the
   connected account's **native balance** query (see issue #29) — it does not
   fetch, stream, or display token prices.

5. \Vault TVL metrics\ is referenced in the issue background — no Vault
   feature exists in this repo (see also issue #67 audit,
   \docs/issue-67-vault-audit.md\).

## What this PR does
Adds this audit doc only. **No existing files were modified.** Building a
\PriceContext\/WebSocket layer against a \src/\ structure and price display
component that don't exist would mean guessing at an entirely new feature's
scope, data source (which oracle/RPC?), and UI — not implementing what's
described.

## Question for maintainer
1. Is there a target branch or upstream repo with the \src/\ layout and
   existing price-fetching code this issue was written against?
2. If token price streaming is a genuinely new feature for this repo, what's
   the intended price source (on-chain oracle, third-party API like
   CoinGecko/Chainlink, DEX pool reads)? That determines the whole
   architecture and isn't specified in the issue.
3. Should \useBlockchainData.ts\'s block-watching pattern be extended/reused
   for this, or is it a separate concern?

Happy to design and build the real-time pipeline once the data source and
target scope are confirmed.
