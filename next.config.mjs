/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb'
    }
  },
  webpack: (config) => {
    // @coinbase/cdp-sdk (pulled in transitively by the Coinbase Wallet connector)
    // references optional x402 payment packages we don't install or use.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/core/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false
    };
    return config;
  }
};

export default nextConfig;
