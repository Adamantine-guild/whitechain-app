/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb'
    }
  },
  images: {
    // Next's optimizer negotiates WebP with supported browsers.
    formats: ['image/webp'],
    remotePatterns: [
      // Common token metadata/CDN hosts.
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'images.coingecko.com',
        pathname: '/**'
      },
      // Common ENS avatar and third-party plugin icon hosts.
      {
        protocol: 'https',
        hostname: 'metadata.ens.domains',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'euc.li',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/**'
      }
    ]
  },
  webpack: (config) => {
    // @coinbase/cdp-sdk (pulled in transitively by the Coinbase Wallet connector)
    // references optional x402 payment packages we don't install or use.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@x402/core/client': false,
      '@x402/svm/exact/client': false,
      '@x402/evm': false,
      // @walletconnect/logger (via pino) tries to require 'pino-pretty'
      // at runtime; it is an optional dev-only pretty-printer we never use.
      // Stubbing it removes the noisy "Module not found" build warning.
      'pino-pretty': false,
      // @metamask/sdk references a React-Native-only async storage module that
      // does not exist in a web build; stub it so the import resolves to nothing.
      '@react-native-async-storage/async-storage': false
    };
    return config;
  }
};

export default nextConfig;
