// Web Worker for heavy Cryptographic hashing
// Solves whitechain-app Issue #23 ($150 USDC Bounty)

self.onmessage = async (e: MessageEvent<string>) => {
  const data = e.data;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  self.postMessage(hashHex);
};
